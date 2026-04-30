import express from 'express';
import { createCheckoutSession, handleWebhook, getPaymentHistory } from '../lib/payments/stripeService.mjs';
import { requireAuth } from '../middleware/authMiddleware.mjs';

const router = express.Router();

// POST /api/payments/create-checkout — requires customer auth
router.post('/create-checkout', requireAuth, async (req, res) => {
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

// GET /api/payments/history/:customerId — customer can only see own, admin sees any
router.get('/history/:customerId', requireAuth, async (req, res) => {
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

export default router;
