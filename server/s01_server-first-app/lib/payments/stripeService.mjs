import Stripe from 'stripe';
import pool from '../database/connection.mjs';

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

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { customerId: String(customerId), tier: String(tier) },
    success_url: `${baseUrl}/payment-confirm.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/change-tier.html`
  });

  // Record pending payment
  const connection = await pool.getConnection();
  try {
    await connection.execute(
      `INSERT INTO payments (customer_id, stripe_session_id, amount, tier_purchased, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [customerId, session.id, (await getTierAmounts())[tier], tier]
    );
  } finally {
    connection.release();
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
      await connection.execute(
        `UPDATE payments SET stripe_subscription_id = ?, stripe_payment_intent_id = ?, status = 'completed'
         WHERE stripe_session_id = ?`,
        [session.subscription || null, session.payment_intent || null, session.id]
      );
    } finally {
      connection.release();
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    const priceId = subscription.items.data[0].price.id;
    const newTierEntry = Object.entries(PRICE_IDS).find(([, v]) => v === priceId);
    if (newTierEntry) {
      const newTier = parseInt(newTierEntry[0]);
      const customerId = subscription.metadata?.customerId;
      if (customerId) {
        const connection = await pool.getConnection();
        try {
          await connection.execute(
            `UPDATE customers SET tier = ? WHERE id = ?`,
            [newTier, customerId]
          );
        } finally {
          connection.release();
        }
      }
    }
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;
    const amountPaid = invoice.amount_paid;

    if (subscriptionId && amountPaid > 0) {
      const connection = await pool.getConnection();
      try {
        // Find customer_id from existing payment with this subscription
        const [rows] = await connection.execute(
          `SELECT customer_id, tier_purchased FROM payments WHERE stripe_subscription_id = ? ORDER BY created_at DESC LIMIT 1`,
          [subscriptionId]
        );
        if (rows.length > 0) {
          const { customer_id, tier_purchased } = rows[0];
          // Only insert if not already recorded (avoid duplicate for initial checkout)
          const [existing] = await connection.execute(
            `SELECT id FROM payments WHERE stripe_subscription_id = ? AND stripe_payment_intent_id = ?`,
            [subscriptionId, invoice.payment_intent]
          );
          if (existing.length === 0) {
            await connection.execute(
              `INSERT INTO payments (customer_id, stripe_session_id, stripe_payment_intent_id, stripe_subscription_id, amount, tier_purchased, status)
               VALUES (?, NULL, ?, ?, ?, ?, 'completed')`,
              [customer_id, invoice.payment_intent, subscriptionId, amountPaid, tier_purchased]
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
  console.log('[STRIPE PREVIEW] proration lines:', JSON.stringify(prorationLines.map(l => ({ amount: l.amount, description: l.description }))));
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

  // Get stripe_subscription_id from payments table
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

  // Get current subscription to find subscription item ID
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const itemId = subscription.items.data[0].id;

  // Determine if upgrade or downgrade
  const currentTier = subscription.items.data[0].price.id;
  const currentTierNum = Object.entries(PRICE_IDS).find(([, v]) => v === currentTier)?.[0];
  const isUpgrade = parseInt(newTier) > parseInt(currentTierNum);

  const updated = await stripe.subscriptions.update(subscriptionId, {
    items: [{ id: itemId, price: priceId }],
    proration_behavior: isUpgrade ? 'create_prorations' : 'none',
    ...(isUpgrade ? {} : { billing_cycle_anchor: 'unchanged' })
  });

  return { subscriptionId, isUpgrade, currentPeriodEnd: new Date(updated.current_period_end * 1000) };
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
