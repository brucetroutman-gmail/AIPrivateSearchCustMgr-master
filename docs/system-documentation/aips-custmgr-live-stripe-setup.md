# AI Private Search Customer Manager — Stripe Live Setup Guide

## Overview

This guide covers all steps to configure Stripe for both sandbox testing and live production use, including products, prices, webhooks, customer portal, and environment variables.

---

## Phase 1 — Stripe Dashboard Configuration (Sandbox First, Then Live)

### Step 1: Create Products and Prices

1. Go to **Stripe Dashboard → Product catalog → Add product**
2. Create three products:

| Product Name | Price | Billing |
|---|---|---|
| AI Private Search Standard | $49.00 | Yearly |
| AI Private Search Premium | $199.00 | Yearly |
| AI Private Search Professional | $499.00 | Yearly |

3. For each product, set billing period to **Yearly**
4. Copy the **Price ID** for each (format: `price_xxxxxxxx`) — needed for `.env-custmgr`

---

### Step 2: Configure the Customer Portal

1. Go to **Stripe Dashboard → Product settings → Billing**
2. Click **Customer portal**
3. Enable the portal and configure:

**Business information:**
- Business name: `AI Private Search`
- Support URL: `https://custmgr.aiprivatesearch.com`
- Privacy policy URL: `https://custmgr.aiprivatesearch.com/privacy-policy.html`
- Terms of service URL: `https://custmgr.aiprivatesearch.com/terms-of-service.html`

**Functionality — enable:**
- ✅ Payment methods (customers can update their card)

**Functionality — disable:**
- ❌ Cancellation (we handle this ourselves via Cancel & Refund)
- ❌ Switch plans (we handle this via Change Tier)
- ❌ Pause subscription

4. Click **Save**

> ⚠️ Repeat this configuration separately for **live mode** — portal settings are not shared between sandbox and live.

---

### Step 3: Configure Webhooks

1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL:
   - Sandbox: `https://custmgr.aiprivatesearch.com/api/payments/webhook`
   - Live: same URL
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Webhook signing secret** (format: `whsec_xxxxxxxx`)

> ⚠️ Repeat for live mode — sandbox and live webhooks have separate signing secrets.

---

### Step 4: Get API Keys

1. Go to **Stripe Dashboard → Developers → API keys**
2. Copy:
   - **Publishable key** (format: `pk_test_xxxxxxxx` / `pk_live_xxxxxxxx`)
   - **Secret key** (format: `sk_test_xxxxxxxx` / `sk_live_xxxxxxxx`)

---

## Phase 2 — Environment Variables

Add the following to `/webs/AIPrivateSearch/.env-custmgr` on the Ubuntu server:

```bash
# Stripe Mode — set to 'live' for production
STRIPE_MODE=test

# Stripe Test Keys
STRIPE_SECRET_KEY_TEST=sk_test_xxxxxxxx
STRIPE_PRICE_STANDARD_TEST=price_xxxxxxxx
STRIPE_PRICE_PREMIUM_TEST=price_xxxxxxxx
STRIPE_PRICE_PROFESSIONAL_TEST=price_xxxxxxxx
STRIPE_WEBHOOK_SECRET_TEST=whsec_xxxxxxxx

# Stripe Live Keys
STRIPE_SECRET_KEY_LIVE=sk_live_xxxxxxxx
STRIPE_PRICE_STANDARD_LIVE=price_xxxxxxxx
STRIPE_PRICE_PREMIUM_LIVE=price_xxxxxxxx
STRIPE_PRICE_PROFESSIONAL_LIVE=price_xxxxxxxx
STRIPE_WEBHOOK_SECRET_LIVE=whsec_xxxxxxxx

# App URL for Stripe redirect URLs
APP_URL=https://custmgr.aiprivatesearch.com
```

---

## Phase 3 — Database Migration

Run on the production MySQL server before deploying:

```sql
-- Add Stripe customer ID column (required for billing portal)
ALTER TABLE customers
  ADD COLUMN stripe_customer_id VARCHAR(255) NULL AFTER grace_period_ends;

-- Add stripe_payment_intent_id column if not already present
ALTER TABLE payments
  ADD COLUMN stripe_payment_intent_id VARCHAR(255) NULL AFTER stripe_subscription_id;
```

Verify payments table has all required columns:
```sql
DESCRIBE payments;
-- Expected: id, customer_id, stripe_session_id, stripe_subscription_id,
--           stripe_payment_intent_id, amount, tier_purchased, status,
--           created_at, updated_at
```

---

## Phase 4 — Go Live Checklist

- [ ] L1. Create live products and prices in Stripe dashboard
- [ ] L2. Copy live Price IDs to `.env-custmgr`
- [ ] L3. Copy live Secret Key to `.env-custmgr`
- [ ] L4. Configure customer portal in live mode (separate from sandbox)
- [ ] L5. Create live webhook endpoint, copy signing secret to `.env-custmgr`
- [ ] L6. Run DB migrations on production server
- [ ] L7. Set `STRIPE_MODE=live` in `.env-custmgr`
- [ ] L8. Restart PM2: `pm2 restart aipscust-s56304`
- [ ] L9. Verify server log shows `[STRIPE] Running in live mode`
- [ ] L10. Test full flow with a real card: register → subscribe → upgrade → cancel/refund
- [ ] L11. Verify webhook events arriving in Stripe dashboard → Developers → Webhooks
- [ ] L12. Verify `stripe_customer_id` populated in customers table after first checkout
- [ ] L13. Test billing portal — Update Payment Method button on My Account
- [ ] L14. Verify refund appears in Stripe dashboard → Payments → Refunds
- [ ] L15. Verify refund email received by customer

---

## Phase 5 — Sandbox Testing Checklist

- [ ] S1. Set `STRIPE_MODE=test` in `.env-custmgr`
- [ ] S2. Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC
- [ ] S3. Register customer → verify email → confirm trial
- [ ] S4. Go to Change Tier → select Standard → complete checkout
- [ ] S5. Verify `license_status = active`, `tier = 1` in DB
- [ ] S6. Verify `stripe_customer_id` stored in customers table
- [ ] S7. Verify payment row recorded with `stripe_subscription_id` and `stripe_payment_intent_id`
- [ ] S8. Upgrade to Premium → verify proration preview matches charge
- [ ] S9. Upgrade to Professional → verify proration preview matches charge
- [ ] S10. Cancel & Refund → verify preview shows correct unused days and amount
- [ ] S11. Confirm cancellation → verify partial refund issued in Stripe dashboard
- [ ] S12. Verify customer reverted to trial in DB
- [ ] S13. Verify refund email received
- [ ] S14. Verify negative payment row in payment history
- [ ] S15. Test Update Payment Method → verify Stripe portal opens and returns to My Account

---

## Reference

### Stripe Test Cards
| Card | Result |
|---|---|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Declined |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |

### Key API Endpoints
| Endpoint | Purpose |
|---|---|
| `POST /api/payments/create-checkout` | New Stripe checkout session |
| `POST /api/payments/update-subscription` | Upgrade existing subscription |
| `POST /api/payments/preview-upgrade` | Proration preview before upgrade |
| `GET /api/payments/preview-refund` | Refund calculation preview |
| `POST /api/payments/cancel-and-refund` | Cancel + partial refund |
| `POST /api/payments/billing-portal` | Stripe customer portal session |
| `POST /api/payments/webhook` | Stripe webhook receiver |
| `GET /api/payments/history/:customerId` | Payment history |
| `GET /api/payments/subscription-status` | Check active subscription |
