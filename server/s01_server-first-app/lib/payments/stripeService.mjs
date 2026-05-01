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
const TIER_AMOUNTS = { 1: 4900, 2: 19900, 3: 49900 };

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
      [customerId, session.id, TIER_AMOUNTS[tier], tier]
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
