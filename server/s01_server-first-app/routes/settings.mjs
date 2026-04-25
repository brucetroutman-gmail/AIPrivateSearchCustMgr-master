import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.mjs';

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  res.json({
    license: {
      trial_period_days: 60,
      grace_period_days: 7,
      verification_code_expiry_minutes: 15,
      password_reset_expiry_minutes: 15,
      trial_warning_days: [7, 3, 1]
    },
    device_limits: {
      standard: 2,
      premium: 5,
      professional: 10
    },
    tier_features: {
      standard: ['search', 'collections'],
      premium: ['search', 'multi-mode', 'collections', 'models'],
      professional: ['search', 'multi-mode', 'collections', 'models', 'config', 'doc-index']
    },
    sessions: {
      admin_timeout_minutes: 5,
      customer_timeout_minutes: 30
    },
    email: {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      user: process.env.EMAIL_USER || 'aiprivatesearch@gmail.com',
      download_url: process.env.AIPS_DOWNLOAD_URL || 'https://aiprivatesearch.com/downloads/AIPrivateSearch.dmg',
      upgrade_url: process.env.UPGRADE_URL || 'https://custmgr.aiprivatesearch.com/change-tier.html'
    },
    rate_limiting: {
      general_api: { requests: 100, window_minutes: 15 },
      device_activation: { attempts: 5, window_minutes: 5 }
    },
    password_requirements: {
      min_length: 8,
      requires_uppercase: true,
      requires_lowercase: true,
      requires_number: true
    }
  });
});

export default router;
