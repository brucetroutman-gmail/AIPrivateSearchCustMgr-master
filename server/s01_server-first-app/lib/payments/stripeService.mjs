import Stripe from 'stripe';
import pool from '../database/connection.mjs';
import { EmailService } from '../email/emailService.mjs';

const mode = process.env.STRIPE_MODE || 'test';
const isLive = mode === 'live';

const stripe = new Stripe(isLive ? process.env.STRIPE_SECRET_KEY_LIVE : process.env.STRIPE_SECRET_KEY_TEST);

const PRICE_IDS = {
  1: isLive ? process.env.STRIPE_PRICE_STANDARD_LIVE : process.env.STRIPE_PRICE_STANDARD_TEST,
  2: isLive ? process.env.STRIPE_PRICE_PREMIUM_LIVE : process.env.STRIPE_PRICE_PREMIUM_TEST,
  3: isLive ? process.env.STRIPE_PRICE_PROFESSIONAL_LIVE : process.env.STRIPE_PRICE_PROFESSIONAL_TEST
};

const WEBHOOK_SECRET = isLive ? process.env.STRIPE_WEBHOOK_SECRET_LIVE : process.env.STRIPE_WEBHOOK_SECRET_TEST;

console.log(`[STRIPE] Running in ${mode} mode`);

const TIER_NAMES = { 1: 'Standard', 2: 'Premium', 3: 'Professional' };

// Cache prices fetched from Stripe
let priceCache = null;

async function getTierAmounts() {
  if (priceCache) return priceCache;
  const [p1, p2, p3] = await Promise.all([
    stripe.prices.retrieve(PRICE_IDS[1]),
    stripe.prices.retrieve(PRICE_IDS[2]),
    stripe.prices.retrieve(PRICE_IDS[3])
  ]);
  priceCache = { 1: p1.unit_amount, 2: p2.unit_amount, 3: p3.unit_amount };
  return priceCache;
}

export async function getPrices() {
  const amounts = await getTierAmounts();
  return {
    standard:     { amount: amounts[1], display: `$${(amounts[1] / 100).toFixed(2)}` },
    premium:      { amount: amounts[2], display: `$${(amounts[2] / 100).toFixed(2)}` },
    professional: { amount: amounts[3], display: `$${(amounts[3] / 100).toFixed(2)}` }
  };
}

export async function createCheckoutSession(customerId, email, tier) {
  const priceId = PRICE_IDS[tier];
  if (!priceId) throw new Error('Invalid tier');

  const baseUrl = process.env.APP_URL || 'https://custmgr.aiprivatesearch.com';
  const tierAmounts = await getTierAmounts();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { customerId: String(customerId), tier: String(tier) },
    success_url: `${baseUrl}/payment-confirm.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/change-tier.html`
  });

  const conn = await pool.getConnection();
  try {
    await conn.execute(
      `INSERT INTO payments (customer_id, stripe_session_id, amount, tier_purchased, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [customerId, session.id, tierAmounts[tier], tier]
    );
  } finally {
    conn.release();
  }

  return { url: session.url, sessionId: session.id };
}

export async function handleWebhook(rawBody, signature) {
  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    WEBHOOK_SECRET
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerId = parseInt(session.metadata.customerId);
    const tier = parseInt(session.metadata.tier);

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `UPDATE customers SET tier = ?, license_status = 'active', expires_at = ? WHERE id = ?`,
        [tier, expiresAt, customerId]
      );
      // For subscription checkouts, payment_intent is on the invoice not the session
      const subscriptionId = session.subscription;
      const stripeCustomerId = session.customer || null;
      let paymentIntentId = null;
      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['latest_invoice'] });
        const pi = sub.latest_invoice?.payment_intent;
        paymentIntentId = pi && typeof pi === 'object' ? pi.id : pi;
      }
      await connection.execute(
        `UPDATE payments SET stripe_subscription_id = ?, stripe_payment_intent_id = ?, status = 'completed'
         WHERE stripe_session_id = ?`,
        [subscriptionId || null, paymentIntentId, session.id]
      );
      // Store Stripe customer ID on the customer record for billing portal access
      if (stripeCustomerId) {
        await connection.execute(
          `UPDATE customers SET stripe_customer_id = ? WHERE id = ?`,
          [stripeCustomerId, customerId]
        );
      }
    } finally {
      connection.release();
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    const priceId = subscription.items.data[0].price.id;
    console.log(`[WEBHOOK] subscription.updated: sub=${subscription.id} priceId=${priceId}`);
    console.log(`[WEBHOOK] PRICE_IDS map:`, JSON.stringify(PRICE_IDS));
    const newTierEntry = Object.entries(PRICE_IDS).find(([, v]) => v === priceId);
    console.log(`[WEBHOOK] newTierEntry:`, newTierEntry);
    if (newTierEntry) {
      const newTier = parseInt(newTierEntry[0]);
      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.execute(
          `SELECT customer_id FROM payments WHERE stripe_subscription_id = ? LIMIT 1`,
          [subscription.id]
        );
        console.log(`[WEBHOOK] payments lookup for sub ${subscription.id}: ${rows.length} rows`);
        if (rows.length > 0) {
          const customerId = rows[0].customer_id;
          const periodEnd = subscription.current_period_end;
          const expiresAt = periodEnd ? new Date(periodEnd * 1000) : null;
          const expiresAtValue = expiresAt && expiresAt.getFullYear() > 2000 ? expiresAt : null;
          await connection.execute(
            `UPDATE customers SET tier = ?, license_status = 'active'${expiresAtValue ? ', expires_at = ?' : ''} WHERE id = ?`,
            expiresAtValue ? [newTier, expiresAtValue, customerId] : [newTier, customerId]
          );
          console.log(`[WEBHOOK] Updated customer ${customerId} to tier ${newTier} — payment will be recorded via invoice.paid`);
        } else {
          console.log(`[WEBHOOK] No payment row found for subscription ${subscription.id} — cannot update customer`);
        }
      } finally {
        connection.release();
      }
    } else {
      console.log(`[WEBHOOK] priceId ${priceId} not found in PRICE_IDS — skipping`);
    }
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;
    const amountPaid = invoice.amount_paid;
    console.log(`[WEBHOOK] invoice.paid: sub=${subscriptionId} amount=${amountPaid} reason=${invoice.billing_reason}`);

    // Only record renewal payments — upgrades are recorded directly in updateSubscription
    if (subscriptionId && amountPaid > 0 && invoice.billing_reason === 'subscription_cycle') {
      const connection = await pool.getConnection();
      try {
        // Find customer_id from existing payment with this subscription
        const [rows] = await connection.execute(
          `SELECT customer_id, tier_purchased FROM payments WHERE stripe_subscription_id = ? ORDER BY created_at DESC LIMIT 1`,
          [subscriptionId]
        );
        if (rows.length > 0) {
          const { customer_id } = rows[0];
          // Determine tier from current subscription price
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const currentPriceId = sub.items.data[0].price.id;
          const tierEntry = Object.entries(PRICE_IDS).find(([, v]) => v === currentPriceId);
          const tierPurchased = tierEntry ? parseInt(tierEntry[0]) : rows[0].tier_purchased;
          // Only insert if not already recorded
          const [existing] = await connection.execute(
            `SELECT id FROM payments WHERE stripe_payment_intent_id = ?`,
            [invoice.payment_intent]
          );
          if (existing.length === 0) {
            await connection.execute(
              `INSERT INTO payments (customer_id, stripe_session_id, stripe_payment_intent_id, stripe_subscription_id, amount, tier_purchased, status)
               VALUES (?, NULL, ?, ?, ?, ?, 'completed')`,
              [customer_id, invoice.payment_intent, subscriptionId, amountPaid, tierPurchased]
            );
          }
        }
      } finally {
        connection.release();
      }
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `UPDATE payments SET status = 'failed' WHERE stripe_subscription_id = ?`,
        [invoice.subscription]
      );
    } finally {
      connection.release();
    }
  }

  return { received: true };
}

export async function previewUpgrade(customerId, newTier) {
  const priceId = PRICE_IDS[newTier];
  if (!priceId) throw new Error('Invalid tier');

  const connection = await pool.getConnection();
  let subscriptionId;
  try {
    const [rows] = await connection.execute(
      `SELECT stripe_subscription_id FROM payments WHERE customer_id = ? AND status = 'completed' AND stripe_subscription_id IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
      [customerId]
    );
    if (rows.length === 0) throw new Error('No active subscription found');
    subscriptionId = rows[0].stripe_subscription_id;
  } finally {
    connection.release();
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const itemId = subscription.items.data[0].id;
  const currentAnnualPrice = subscription.items.data[0].price.unit_amount;
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

  const upcoming = await stripe.invoices.retrieveUpcoming({
    subscription: subscriptionId,
    subscription_items: [{ id: itemId, price: priceId }],
    subscription_proration_behavior: 'create_prorations'
  });

  const prorationLines = upcoming.lines.data.filter(l => l.proration);
  // Only use the credit line matching the current subscription price to avoid stale credits
  const currentPriceCredit = prorationLines
    .filter(l => l.amount < 0 && Math.abs(l.amount) <= currentAnnualPrice)
    .reduce((best, l) => !best || Math.abs(l.amount) > Math.abs(best.amount) ? l : best, null);
  const credit = currentPriceCredit ? currentPriceCredit.amount : prorationLines.filter(l => l.amount < 0).reduce((sum, l) => sum + l.amount, 0);
  const charge = prorationLines.filter(l => l.amount > 0).reduce((sum, l) => sum + l.amount, 0);
  const totalDue = Math.max(0, charge + credit);
  const usedAmount = currentAnnualPrice + credit;

  const newTierAnnualPrice = (await getTierAmounts())[newTier];
  const unusedCreditAbs = Math.abs(credit);
  const extensionMonths = newTierAnnualPrice > 0
    ? Math.floor((unusedCreditAbs / newTierAnnualPrice) * 12)
    : 0;
  const newExpiryDate = new Date(currentPeriodEnd);
  newExpiryDate.setMonth(newExpiryDate.getMonth() + extensionMonths);

  const fmt = (cents) => `$${(Math.abs(cents) / 100).toFixed(2)}`;
  const fmtMonthly = (annual) => `$${(annual / 100 / 12).toFixed(2)}/mo`;

  return {
    amountDue: totalDue,
    amountDisplay: fmt(totalDue),
    credit: fmt(credit),
    charge: fmt(charge),
    currentAnnualPrice: fmt(currentAnnualPrice),
    usedAmount: fmt(usedAmount),
    unusedCredit: fmt(unusedCreditAbs),
    newTierMonthlyRate: fmtMonthly(newTierAnnualPrice),
    extensionMonths,
    newExpiryDate,
    currentPeriodEnd,
    newPeriodEnd: currentPeriodEnd,
    nextBillingDate: new Date(upcoming.period_end * 1000)
  };
}

export async function updateSubscription(customerId, newTier) {
  const priceId = PRICE_IDS[newTier];
  if (!priceId) throw new Error('Invalid tier');

  const connection = await pool.getConnection();
  let subscriptionId;
  try {
    const [rows] = await connection.execute(
      `SELECT stripe_subscription_id FROM payments WHERE customer_id = ? AND status = 'completed' AND stripe_subscription_id IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
      [customerId]
    );
    if (rows.length === 0) throw new Error('No active subscription found');
    subscriptionId = rows[0].stripe_subscription_id;
  } finally {
    connection.release();
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const itemId = subscription.items.data[0].id;

  // Calculate prorated amount before updating
  const upcoming = await stripe.invoices.retrieveUpcoming({
    subscription: subscriptionId,
    subscription_items: [{ id: itemId, price: priceId }],
    subscription_proration_behavior: 'create_prorations'
  });
  const prorationLines = upcoming.lines.data.filter(l => l.proration);
  const currentAnnualPrice = subscription.items.data[0].price.unit_amount;
  const creditLine = prorationLines
    .filter(l => l.amount < 0 && Math.abs(l.amount) <= currentAnnualPrice)
    .reduce((best, l) => !best || Math.abs(l.amount) > Math.abs(best.amount) ? l : best, null);
  const credit = creditLine ? creditLine.amount : prorationLines.filter(l => l.amount < 0).reduce((sum, l) => sum + l.amount, 0);
  const charge = prorationLines.filter(l => l.amount > 0).reduce((sum, l) => sum + l.amount, 0);
  const prorationAmount = Math.max(0, charge + credit);

  const updated = await stripe.subscriptions.update(subscriptionId, {
    items: [{ id: itemId, price: priceId }],
    proration_behavior: 'always_invoice'
  });

  if (prorationAmount > 0) {
    const conn2 = await pool.getConnection();
    try {
      await conn2.execute(
        `INSERT INTO payments (customer_id, stripe_subscription_id, amount, tier_purchased, status)
         VALUES (?, ?, ?, ?, 'completed')`,
        [customerId, subscriptionId, prorationAmount, newTier]
      );
      console.log(`[STRIPE] Recorded upgrade payment: customer=${customerId} tier=${newTier} amount=${prorationAmount}`);
    } finally {
      conn2.release();
    }
  }

  return { subscriptionId, currentPeriodEnd: new Date(updated.current_period_end * 1000) };
}

export async function previewRefund(customerId) {
  const connection = await pool.getConnection();
  let subscriptionId;
  try {
    const [rows] = await connection.execute(
      `SELECT stripe_subscription_id FROM payments WHERE customer_id = ? AND status = 'completed' AND stripe_subscription_id IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
      [customerId]
    );
    if (rows.length === 0) throw new Error('No active subscription found');
    subscriptionId = rows[0].stripe_subscription_id;
  } finally {
    connection.release();
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const annualPrice = subscription.items.data[0].price.unit_amount;
  const periodStart = subscription.current_period_start;
  const periodEnd = subscription.current_period_end;
  const now = Math.floor(Date.now() / 1000);

  const totalDays = Math.round((periodEnd - periodStart) / 86400);
  const usedDays = Math.round((now - periodStart) / 86400);
  const unusedDays = Math.max(0, totalDays - usedDays);
  const refundAmount = Math.round(annualPrice * (unusedDays / 365));

  const fmt = (cents) => `$${(cents / 100).toFixed(2)}`;
  const tierEntry = Object.entries(PRICE_IDS).find(([, v]) => v === subscription.items.data[0].price.id);
  const tierName = TIER_NAMES[tierEntry?.[0]] || 'Current Plan';

  return {
    annualPrice,
    annualPriceDisplay: fmt(annualPrice),
    usedDays,
    unusedDays,
    totalDays,
    refundAmount,
    refundDisplay: fmt(refundAmount),
    tierName,
    periodEnd: new Date(periodEnd * 1000)
  };
}

export async function cancelAndRefund(customerId) {
  const connection = await pool.getConnection();
  let subscriptionId;
  try {
    const [rows] = await connection.execute(
      `SELECT stripe_subscription_id FROM payments WHERE customer_id = ? AND status = 'completed' AND stripe_subscription_id IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
      [customerId]
    );
    if (rows.length === 0) throw new Error('No active subscription found');
    subscriptionId = rows[0].stripe_subscription_id;
  } finally {
    connection.release();
  }

  // Calculate prorated refund amount from subscription period
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice']
  });
  const annualPrice = subscription.items.data[0].price.unit_amount;
  const periodStart = subscription.current_period_start;
  const periodEnd = subscription.current_period_end;
  const now = Math.floor(Date.now() / 1000);
  const unusedDays = Math.max(0, Math.round((periodEnd - now) / 86400));
  const refundAmount = Math.round(annualPrice * (unusedDays / 365));

  // Resolve payment intent from latest invoice
  let paymentIntentId = subscription.latest_invoice?.payment_intent;
  if (paymentIntentId && typeof paymentIntentId === 'object') paymentIntentId = paymentIntentId.id;

  // If latest invoice PI doesn't have enough charged, find the most recent paid invoice
  if (!paymentIntentId) {
    const invoices = await stripe.invoices.list({ subscription: subscriptionId, status: 'paid', limit: 1 });
    paymentIntentId = invoices.data[0]?.payment_intent;
  }

  if (!paymentIntentId) throw new Error('Could not resolve payment intent for refund');

  // Issue partial refund for unused days
  await stripe.refunds.create({ payment_intent: paymentIntentId, amount: refundAmount });
  await stripe.subscriptions.cancel(subscriptionId);

  const amountDisplay = `$${(refundAmount / 100).toFixed(2)}`;

  const conn2 = await pool.getConnection();
  let customerEmail, trialExpiry;
  try {
    await conn2.execute(
      `UPDATE payments SET stripe_subscription_id = NULL, status = 'refunded' WHERE stripe_subscription_id = ?`,
      [subscriptionId]
    );
    await conn2.execute(
      `INSERT INTO payments (customer_id, stripe_payment_intent_id, amount, tier_purchased, status)
       VALUES (?, ?, ?, 1, 'refunded')`,
      [customerId, paymentIntentId, -refundAmount]
    );
    trialExpiry = new Date();
    trialExpiry.setDate(trialExpiry.getDate() + 60);
    await conn2.execute(
      `UPDATE customers SET tier = 1, license_status = 'trial', expires_at = ?, grace_period_ends = NULL WHERE id = ?`,
      [trialExpiry, customerId]
    );
    const [custRows] = await conn2.execute(`SELECT email FROM customers WHERE id = ?`, [customerId]);
    customerEmail = custRows[0]?.email;
    console.log(`[STRIPE] Refund+cancel: customer=${customerId} unusedDays=${unusedDays} amount=${amountDisplay} reverted to trial until ${trialExpiry}`);
  } finally {
    conn2.release();
  }

  if (customerEmail) {
    const emailService = new EmailService();
    await emailService.sendRefundEmail(customerEmail, amountDisplay, trialExpiry).catch(err =>
      console.error('[STRIPE] Refund email failed:', err.message)
    );
  }

  return { refunded: true, amountDisplay };
}

export async function createBillingPortalSession(customerId) {
  const connection = await pool.getConnection();
  let stripeCustomerId;
  try {
    const [rows] = await connection.execute(
      `SELECT stripe_customer_id FROM customers WHERE id = ?`,
      [customerId]
    );
    stripeCustomerId = rows[0]?.stripe_customer_id;
  } finally {
    connection.release();
  }

  if (!stripeCustomerId) throw new Error('No Stripe customer found — please contact support');

  const baseUrl = process.env.APP_URL || 'https://custmgr.aiprivatesearch.com';
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${baseUrl}/my-account.html`
  });

  return { url: session.url };
}

export async function getSubscriptionId(customerId) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT stripe_subscription_id FROM payments WHERE customer_id = ? AND status = 'completed' AND stripe_subscription_id IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
      [customerId]
    );
    return rows[0]?.stripe_subscription_id || null;
  } finally {
    connection.release();
  }
}

export async function getPaymentHistory(customerId) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT id, amount, tier_purchased, status, stripe_session_id, created_at, updated_at
       FROM payments WHERE customer_id = ? ORDER BY created_at DESC`,
      [customerId]
    );
    return rows.map(r => ({
      ...r,
      tier_name: TIER_NAMES[r.tier_purchased] || 'Unknown',
      amount_display: `$${(r.amount / 100).toFixed(2)}`
    }));
  } finally {
    connection.release();
  }
}
