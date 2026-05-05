import express from 'express';
import { createCheckoutSession, handleWebhook, getPaymentHistory, updateSubscription, getSubscriptionId, previewUpgrade, getPrices, cancelAndRefund, previewRefund } from '../lib/payments/stripeService.mjs';

const router = express.Router();

// GET /api/payments/prices — fetch live prices from Stripe (public)
router.get('/prices', async (req, res) => {
  try {
    const prices = await getPrices();
    res.json({ success: true, prices });
  } catch (error) {
    console.error('[PAYMENTS] prices error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payments/create-checkout
router.post('/create-checkout', async (req, res) => {
  try {
    const { tier } = req.body;
    if (!tier || ![1, 2, 3].includes(parseInt(tier))) {
      return res.status(400).json({ error: 'Valid tier (1, 2, or 3) is required' });
    }

    const result = await createCheckoutSession(
      req.user.id,
      req.user.email,
      parseInt(tier)
    );

    res.json({ success: true, url: result.url });
  } catch (error) {
    console.error('[PAYMENTS] create-checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payments/webhook — raw body, no auth, Stripe signature verified inside
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  if (!signature) return res.status(400).json({ error: 'Missing stripe-signature header' });

  try {
    const result = await handleWebhook(req.body, signature);
    res.json(result);
  } catch (error) {
    console.error('[PAYMENTS] webhook error:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/payments/preview-upgrade — returns prorated charge preview without charging
router.post('/preview-upgrade', async (req, res) => {
  try {
    const { tier } = req.body;
    if (!tier || ![1, 2, 3].includes(parseInt(tier))) {
      return res.status(400).json({ error: 'Valid tier required' });
    }
    const preview = await previewUpgrade(req.user.id, parseInt(tier));
    res.json({ success: true, ...preview });
  } catch (error) {
    console.error('[PAYMENTS] preview-upgrade error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payments/update-subscription — upgrade existing subscription
router.post('/update-subscription', async (req, res) => {
  try {
    const { tier } = req.body;
    if (!tier || ![1, 2, 3].includes(parseInt(tier))) {
      return res.status(400).json({ error: 'Valid tier (1, 2, or 3) is required' });
    }
    const result = await updateSubscription(req.user.id, parseInt(tier));
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[PAYMENTS] update-subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/payments/subscription-status — check if customer has active subscription
router.get('/subscription-status', async (req, res) => {
  try {
    const subscriptionId = await getSubscriptionId(req.user.id);
    res.json({ hasSubscription: !!subscriptionId, subscriptionId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/payments/history/:customerId
router.get('/history/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const isAdmin = ['admin', 'manager'].includes(req.user.userRole);

    if (!isAdmin && req.user.id != customerId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const payments = await getPaymentHistory(parseInt(customerId));
    res.json({ payments });
  } catch (error) {
    console.error('[PAYMENTS] history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/payments/preview-refund — calculate prorated refund amount before confirming
router.get('/preview-refund', async (req, res) => {
  try {
    const preview = await previewRefund(req.user.id);
    res.json({ success: true, ...preview });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payments/cancel-and-refund — refund latest payment, cancel subscription, revert to trial
router.post('/cancel-and-refund', async (req, res) => {
  try {
    const result = await cancelAndRefund(req.user.id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[PAYMENTS] cancel-and-refund error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
