# AI Private Search — Stripe Payment Integration Setup

## Overview
Stripe subscription billing for AI Private Search Customer Manager.
- Annual billing: Standard $49/yr, Premium $199/yr, Professional $499/yr
- Hosted Stripe Checkout (no card data touches our server)
- Webhook-driven license activation

---

## Part 1 — Stripe Dashboard Setup

### 1.1 Create Account
- Go to https://stripe.com and sign up
- Complete business details and bank account for payouts before going live

### 1.2 Create Products (Test Mode First)
In Stripe Dashboard → Products → Add Product:

| Product Name   | Price    | Billing   | Interval |
|----------------|----------|-----------|----------|
| Standard       | $49.00   | Recurring | Yearly   |
| Premium        | $199.00  | Recurring | Yearly   |
| Professional   | $499.00  | Recurring | Yearly   |

To get the Price ID: Products → click product → Pricing section → click `...` → Copy Price ID

**Test Price IDs (our app):**
- Standard: `price_1TRv0o3EkqjqtHVakbGpaQc2`
- Premium: `price_1TRv1g3EkqjqtHVaCuVC7vfi`
- Professional: `price_1TRv2P3EkqjqtHVatseLLSqz`

### 1.3 Get API Keys
Dashboard → Developers → API Keys
- Copy Publishable key (`pk_test_xxx`)
- Copy Secret key (`sk_test_xxx`)

> ⚠️ Never paste API keys in chat or commit them to git.  
> If exposed, immediately roll them in the Stripe dashboard.

### 1.4 Create Webhook Endpoint
Dashboard → Developers → Webhooks → Add endpoint

- **URL:** `https://custmgr.aiprivatesearch.com/api/payments/webhook`
- **Events to listen for:**
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`

After creating, click **Reveal** next to Signing secret to get `whsec_xxx`.

---

## Part 2 — Environment Configuration

Add to `/webs/AIPrivateSearch/.env-custmgr`:

```bash
STRIPE_MODE=test   # change to 'live' for production

# Test credentials
STRIPE_SECRET_KEY_TEST=sk_test_xxx
STRIPE_WEBHOOK_SECRET_TEST=whsec_xxx
STRIPE_PRICE_STANDARD_TEST=price_1TRv0o3EkqjqtHVakbGpaQc2
STRIPE_PRICE_PREMIUM_TEST=price_1TRv1g3EkqjqtHVaCuVC7vfi
STRIPE_PRICE_PROFESSIONAL_TEST=price_1TRv2P3EkqjqtHVatseLLSqz

# Live credentials (fill in after activating Stripe account)
STRIPE_SECRET_KEY_LIVE=sk_live_xxx
STRIPE_WEBHOOK_SECRET_LIVE=whsec_xxx
STRIPE_PRICE_STANDARD_LIVE=price_xxx
STRIPE_PRICE_PREMIUM_LIVE=price_xxx
STRIPE_PRICE_PROFESSIONAL_LIVE=price_xxx

APP_URL=https://custmgr.aiprivatesearch.com
```

---

## Part 3 — Database

Payments table (created manually by admin user, not by app):

```sql
CREATE TABLE IF NOT EXISTS payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  stripe_session_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  amount INT NOT NULL,
  tier_purchased TINYINT NOT NULL,
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

> Note: `amount` is stored in cents (e.g. 19900 = $199.00). The app divides by 100 for display.

> Note: The app DB user (`aips-readwrite`) does not have CREATE TABLE permission.
> Always create tables manually using a privileged MySQL user.

---

## Part 4 — Server Code

### 4.1 Key Files
| File | Purpose |
|------|---------|
| `lib/payments/stripeService.mjs` | createCheckoutSession, handleWebhook, getPaymentHistory |
| `routes/payments.mjs` | POST /create-checkout, POST /webhook, GET /history/:customerId |
| `server.mjs` | Raw body parser for webhook, payments route registration, CSP config |

### 4.2 Critical server.mjs Requirements
- Stripe webhook raw body parser must be registered **before** `express.json()`
- Webhook route must be excluded from auth middleware
- Helmet CSP must include Stripe domains:
  - `scriptSrc`: `https://js.stripe.com`
  - `connectSrc`: `https://api.stripe.com`
  - `frameSrc`: `https://js.stripe.com`
- `frameSrc` must NOT include `'none'` — it cannot be combined with other values

### 4.3 Webhook Flow
1. Customer completes payment on Stripe hosted checkout
2. Stripe sends `checkout.session.completed` to `/api/payments/webhook`
3. Webhook handler:
   - Updates `customers` table: `tier`, `license_status = 'active'`, `expires_at = +1 year`
   - Updates `payments` table: `stripe_subscription_id`, `stripe_payment_intent_id`, `status = 'completed'`

---

## Part 5 — Frontend Pages

### change-tier.html
- Displays 3 tier options with annual prices
- On submit: calls `POST /api/payments/create-checkout` with selected tier
- Redirects to Stripe hosted checkout URL returned by API
- Auth redirect goes to `/login.html`

### payment-confirm.html
- Reads `session_id` from URL query param (Stripe appends on return)
- Waits 2 seconds for webhook to process
- Checks payment history for matching session
- Shows: ✅ Success / ⏳ Pending / ❌ Failure
- "Go to My Account" button on all states

### my-account.html
- Payment History button calls `GET /api/payments/history/:customerId`
- Displays inline before Manage Devices section
- Shows: Date, Tier, Amount ($xxx.xx), Status
- Toggle — click again to close
- Has ✕ Close button

---

## Part 6 — Switching to Live Mode

### 6.1 Activate Stripe Account
- Dashboard → Activate your account
- Complete business details and bank account

### 6.2 Create Live Products
- Switch to Live mode in Stripe dashboard (toggle top left)
- Repeat Part 1.2 — create same 3 products with same prices
- Note new live `price_xxx` IDs

### 6.3 Create Live Webhook
- Repeat Part 1.4 with same URL and events
- Note new live `whsec_xxx`

### 6.4 Update .env-custmgr
```bash
STRIPE_MODE=live
STRIPE_SECRET_KEY_LIVE=sk_live_xxx
STRIPE_WEBHOOK_SECRET_LIVE=whsec_xxx
STRIPE_PRICE_STANDARD_LIVE=price_xxx
STRIPE_PRICE_PREMIUM_LIVE=price_xxx
STRIPE_PRICE_PROFESSIONAL_LIVE=price_xxx
```

### 6.5 Restart
```bash
pm2 restart aipscust-s56304
```

---

## Part 7 — Testing

### Test Card Numbers (Stripe test mode only)
| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Declined |
| `4000 0025 0000 3155` | 3D Secure required |

- Expiry: any future date (e.g. `12/29`)
- CVC: any 3 digits (e.g. `123`)
- ZIP: any 5 digits

### Verification Checklist
- [ ] Checkout flow redirects to Stripe hosted page
- [ ] Successful payment returns to payment-confirm.html with success message
- [ ] Webhook updates customer tier in DB
- [ ] Webhook sets license_status to 'active'
- [ ] Webhook sets expires_at to 1 year from payment date
- [ ] Payment history shows correct date, tier, amount, status
- [ ] Failed payment shows failure state on payment-confirm.html

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Webhook 401 | Webhook route not excluded from auth middleware | Add `/api/payments/webhook` to public routes |
| Payment history 401 | Double auth — route middleware conflicting with global middleware | Remove `requireAuth` from payments route |
| CSP frameSrc error | `'none'` combined with other values | Remove `'none'`, keep only `https://js.stripe.com` |
| Button not firing | `onclick` in innerHTML blocked by CSP | Use DOM methods + `addEventListener` instead |
| Amount shows 19900 | Stored in cents, not divided for display | Divide by 100: `(amount / 100).toFixed(2)` |
