import fs from 'fs';
import path from 'path';

const SETTINGS_PATH = path.join(process.cwd(), 'client/c01_client-first-app/config/settings.json');

let cachedSettings = null;

function isPositiveInteger(val) {
  return Number.isInteger(val) && val > 0;
}

function isValidUrl(val) {
  try { new URL(val); return true; } catch { return false; }
}

function validate(s) {
  const errors = [];

  const intFields = [
    'trial_period_days',
    'grace_period_days',
    'verification_expiry_minutes',
    'password_reset_expiry_minutes',
    'session_timeout_admin',
    'session_timeout_customer'
  ];

  for (const field of intFields) {
    if (s[field] === undefined) {
      errors.push(`"${field}" is required`);
    } else if (!isPositiveInteger(s[field])) {
      errors.push(`"${field}" must be an integer > 0 (got: ${JSON.stringify(s[field])})`);
    }
  }

  if (s.trial_warning_days === undefined) {
    errors.push('"trial_warning_days" is required');
  } else if (!Array.isArray(s.trial_warning_days) || s.trial_warning_days.length === 0) {
    errors.push('"trial_warning_days" must be a non-empty array of integers > 0');
  } else {
    s.trial_warning_days.forEach((d, i) => {
      if (!isPositiveInteger(d)) {
        errors.push(`"trial_warning_days[${i}]" must be an integer > 0 (got: ${JSON.stringify(d)})`);
      }
    });
  }

  if (s.device_limits === undefined) {
    errors.push('"device_limits" is required');
  } else {
    for (const tier of ['standard', 'premium', 'professional']) {
      if (s.device_limits[tier] === undefined) {
        errors.push(`"device_limits.${tier}" is required`);
      } else if (!isPositiveInteger(s.device_limits[tier])) {
        errors.push(`"device_limits.${tier}" must be an integer > 0 (got: ${JSON.stringify(s.device_limits[tier])})`);
      }
    }
  }

  for (const field of ['download_url', 'upgrade_url']) {
    if (s[field] === undefined) {
      errors.push(`"${field}" is required`);
    } else if (!isValidUrl(s[field])) {
      errors.push(`"${field}" must be a valid URL (got: ${JSON.stringify(s[field])})`);
    }
  }

  return errors;
}

export function loadSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    throw new Error(`settings.json not found at: ${SETTINGS_PATH}`);
  }

  let raw;
  try {
    raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read settings.json: ${err.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`settings.json contains invalid JSON: ${err.message}`);
  }

  const errors = validate(parsed);
  if (errors.length > 0) {
    throw new Error(`settings.json validation failed:\n  - ${errors.join('\n  - ')}`);
  }

  cachedSettings = parsed;
  return cachedSettings;
}

export function reloadSettings() {
  cachedSettings = null;
  return loadSettings();
}

export function getSettings() {
  if (!cachedSettings) {
    throw new Error('Settings not loaded. Call loadSettings() at server startup.');
  }
  return cachedSettings;
}
