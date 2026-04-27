import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.mjs';
import { getSettings, reloadSettings } from '../lib/settings-loader.mjs';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const SETTINGS_PATH = path.join(process.cwd(), 'client/c01_client-first-app/config/settings.json');

router.get('/', requireAuth, (req, res) => {
  const s = getSettings();
  res.json({
    license: {
      trial_period_days: s.trial_period_days,
      grace_period_days: s.grace_period_days,
      verification_code_expiry_minutes: s.verification_expiry_minutes,
      password_reset_expiry_minutes: s.password_reset_expiry_minutes,
      trial_warning_days: s.trial_warning_days
    },
    device_limits: {
      standard: s.device_limits.standard,
      premium: s.device_limits.premium,
      professional: s.device_limits.professional
    },
    tier_features: {
      standard: ['search', 'collections'],
      premium: ['search', 'multi-mode', 'collections', 'models'],
      professional: ['search', 'multi-mode', 'collections', 'models', 'config', 'doc-index']
    },
    sessions: {
      admin_timeout_minutes: s.session_timeout_admin / 60,
      customer_timeout_minutes: s.session_timeout_customer / 60
    },
    email: {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      user: process.env.EMAIL_USER || 'aiprivatesearch@gmail.com',
      download_url: s.download_url,
      upgrade_url: s.upgrade_url
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

router.put('/', requireAuth, (req, res) => {
  if (!['admin', 'manager'].includes(req.user.userRole)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const body = req.body;
  const errors = [];

  const intFields = [
    'trial_period_days', 'grace_period_days',
    'verification_expiry_minutes', 'password_reset_expiry_minutes',
    'session_timeout_admin', 'session_timeout_customer'
  ];

  for (const field of intFields) {
    if (body[field] === undefined) {
      errors.push(`"${field}" is required`);
    } else if (!Number.isInteger(body[field]) || body[field] <= 0) {
      errors.push(`"${field}" must be an integer > 0`);
    }
  }

  if (!Array.isArray(body.trial_warning_days) || body.trial_warning_days.length === 0) {
    errors.push('"trial_warning_days" must be a non-empty array of integers > 0');
  } else {
    body.trial_warning_days.forEach((d, i) => {
      if (!Number.isInteger(d) || d <= 0) errors.push(`"trial_warning_days[${i}]" must be an integer > 0`);
    });
  }

  if (!body.device_limits) {
    errors.push('"device_limits" is required');
  } else {
    for (const tier of ['standard', 'premium', 'professional']) {
      if (!Number.isInteger(body.device_limits[tier]) || body.device_limits[tier] <= 0) {
        errors.push(`"device_limits.${tier}" must be an integer > 0`);
      }
    }
  }

  for (const field of ['download_url', 'upgrade_url']) {
    try { new URL(body[field]); } catch {
      errors.push(`"${field}" must be a valid URL`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(body, null, 2), 'utf8');
    reloadSettings();
    res.json({ success: true, settings: getSettings() });
  } catch (error) {
    res.status(500).json({ error: `Failed to save settings: ${error.message}` });
  }
});

export default router;
