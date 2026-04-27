# AIPS CustMgr Settings.json Implementation Plan

## Overview
Replace all hardcoded system values with a configurable `settings.json` file.
Administrators can edit values via the Settings page without code deployment.
Server validates all settings at startup and refuses to start if any are missing or invalid.

## Rollback Strategy
- Current stable state is committed at v1.56
- To revert: `git revert` or `git checkout v1.56` returns to exact current state
- No fallbacks — strict validation ensures settings are always correct

---

## Phase 1: Create settings.json

- [x] 1.1 Create `client/c01_client-first-app/config/settings.json` with all configurable values:
```json
{
  "trial_period_days": 60,
  "grace_period_days": 7,
  "verification_expiry_minutes": 15,
  "password_reset_expiry_minutes": 15,
  "trial_warning_days": [7, 3, 1],
  "device_limits": {
    "standard": 2,
    "premium": 5,
    "professional": 10
  },
  "session_timeout_admin": 300,
  "session_timeout_customer": 1800,
  "download_url": "https://aiprivatesearch.com/downloads/AIPrivateSearch.dmg",
  "upgrade_url": "https://custmgr.aiprivatesearch.com/change-tier.html"
}
```

---

## Phase 2: Create Settings Loader with Strict Validation

- [x] 2.1 Create `server/s01_server-first-app/lib/settings-loader.mjs`
  - Reads `settings.json` from `client/c01_client-first-app/config/settings.json`
  - Validates every required field:
    - `trial_period_days` — integer > 0
    - `grace_period_days` — integer > 0
    - `verification_expiry_minutes` — integer > 0
    - `password_reset_expiry_minutes` — integer > 0
    - `trial_warning_days` — array of integers, each > 0
    - `device_limits.standard` — integer > 0
    - `device_limits.premium` — integer > 0
    - `device_limits.professional` — integer > 0
    - `session_timeout_admin` — integer > 0
    - `session_timeout_customer` — integer > 0
    - `download_url` — valid URL string
    - `upgrade_url` — valid URL string
  - Throws descriptive error and **stops server startup** if any field is missing or invalid
  - Error message names the specific field and reason (e.g. "trial_period_days must be an integer > 0")
  - Exports `getSettings()` — returns cached settings object
  - Exports `reloadSettings()` — re-reads and re-validates file (called after admin saves)

---

## Phase 3: Update Server Files to Use Settings

- [x] 3.1 `lib/customers/customerManager.mjs`
  - Replace `+ 60` (trial days) with `getSettings().trial_period_days`
  - Replace `INTERVAL 15 MINUTE` (verification code) with `getSettings().verification_expiry_minutes`
  - Replace `INTERVAL 15 MINUTE` (password reset) with `getSettings().password_reset_expiry_minutes`

- [x] 3.2 `lib/tier-helpers.mjs`
  - Replace `{ 1: 2, 2: 5, 3: 10 }` with values from `getSettings().device_limits`

- [x] 3.3 `lib/notifications/trialNotificationService.mjs`
  - Replace hardcoded `7` (grace period) with `getSettings().grace_period_days`
  - Replace hardcoded `[7, 3, 1]` (warning days) with `getSettings().trial_warning_days`

- [x] 3.4 `lib/auth/unifiedUserManager.mjs`
  - Replace hardcoded `300` (admin timeout) with `getSettings().session_timeout_admin`
  - Replace hardcoded `1800` (customer timeout) with `getSettings().session_timeout_customer`

- [x] 3.5 `lib/email/emailService.mjs`
  - Replace hardcoded `download_url` with `getSettings().download_url`
  - Replace hardcoded `upgrade_url` with `getSettings().upgrade_url`
  - Replace hardcoded `60` in email text with `getSettings().trial_period_days`

- [x] 3.6 `routes/settings.mjs`
  - Replace hardcoded values with `getSettings()` so Settings page reflects actual live values

---

## Phase 4: Update Settings Page to Allow Editing

- [x] 4.1 Add `PUT /api/settings` endpoint (admin only)
  - Accepts updated settings JSON body
  - Runs same strict validation as settings-loader
  - Returns descriptive error per failing field (field name + reason)
  - Writes to `settings.json` only if ALL fields pass validation
  - Calls `reloadSettings()` after successful write
  - Returns updated settings on success

- [x] 4.2 Update `settings.html`
  - Replace read-only display with editable input fields
  - Single Save All button
  - Show validation errors inline next to the failing field
  - Show success confirmation after save
  - Reload displayed values from API after save

---

## Phase 5: Testing

- [ ] 5.1 Server starts correctly with valid `settings.json`
- [ ] 5.2 Server refuses to start with **missing** `settings.json` — clear error message
- [ ] 5.3 Server refuses to start with **corrupt/invalid JSON** — clear error message
- [ ] 5.4 Server refuses to start with **missing required field** — names the missing field
- [ ] 5.5 Server refuses to start with **invalid value** (e.g. `trial_period_days: -1`) — names field and reason
- [ ] 5.6 Change trial period to 30 days via UI, register new customer, verify 30-day expiry
- [ ] 5.7 Change device limit Standard to 3 via UI, verify new registrations get 3 devices
- [ ] 5.8 Submit invalid value via UI (e.g. `trial_period_days: "abc"`) — verify inline error shown
- [ ] 5.9 Save valid settings via UI, verify `settings.json` updated on disk
- [ ] 5.10 Restart server, verify saved settings persist correctly

---

## Files Changed

| File | Change |
|------|--------|
| `client/c01_client-first-app/config/settings.json` | NEW — configurable settings |
| `server/s01_server-first-app/lib/settings-loader.mjs` | NEW — loader with strict validation |
| `server/s01_server-first-app/lib/customers/customerManager.mjs` | Replace 3 hardcoded values |
| `server/s01_server-first-app/lib/tier-helpers.mjs` | Replace device limits |
| `server/s01_server-first-app/lib/notifications/trialNotificationService.mjs` | Replace 2 hardcoded values |
| `server/s01_server-first-app/lib/auth/unifiedUserManager.mjs` | Replace 2 session timeouts |
| `server/s01_server-first-app/lib/email/emailService.mjs` | Replace 3 hardcoded values |
| `server/s01_server-first-app/routes/settings.mjs` | Use getSettings() |
| `client/c01_client-first-app/settings.html` | Add editable fields and save |
