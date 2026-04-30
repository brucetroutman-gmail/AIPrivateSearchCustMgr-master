Here's a **clean, production-ready plan** for implementing Stripe with your chosen **annual tier pricing**:

- **Tier 1**: $49 per year  
- **Tier 2**: $199 per year  
- **Tier 3**: $499 per year  

### Recommended Approach: Use Stripe Subscriptions (Annual Billing)

Even though you're charging annually upfront, the best long-term choice is to use **Stripe Billing with `mode: 'subscription'`** and set the recurring interval to **yearly**.

**Why this is better than one-time payments (`mode: 'payment'`):**
- Automatic renewal after 1 year (you get recurring revenue without manual work).
- Stripe handles dunning, failed payment retries, and emails.
- Easier upgrades/downgrades later.
- Proper subscription object for tracking status, period end, etc.
- You can later add monthly options or trials with minimal changes.

### Final Pricing Decision Summary
- Billing cycle: **Yearly** (recurring)
- Prices: $49 / $199 / $499 (you can offer a small discount vs monthly if you ever add it)
- No free trial for v1 (you can add later)

---

### Revised 4-Step Implementation Plan (Stripe Edition)

#### **Before Starting (Do This First)**
1. **Create Products & Prices in Stripe Dashboard** (recommended for simplicity):
   - Create 3 Products: e.g., “Basic Plan”, “Pro Plan”, “Enterprise Plan”
   - For each product, create **one recurring Price** with:
     - Billing interval = **Year**
     - Amount = 4900 / 19900 / 49900 cents
   - Note the `price_xxx` IDs — you'll use them in code.

2. **Set up Stripe keys**:
   - Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to your `.env`
   - Use test keys first.

3. **Decide URLs**:
   - Success URL: `https://yoursite.com/payment-confirm?session_id={CHECKOUT_SESSION_ID}`
   - Cancel URL: `https://yoursite.com/change-tier`

---

#### **Step 1 — Backend: Stripe Service + Database + Routes**

**New / Updated files:**

- `lib/payments/stripeService.mjs` (main service)
  - `createCheckoutSession(customerId, tier, priceId)`
  - `handleWebhook(event)`
  - `getSubscriptionStatus(customerId)` (optional for later)

- Update or create `payments` table (or better: add a `subscriptions` table too):
  Recommended columns for `payments`:
  - `id`, `customer_id`, `stripe_session_id`, `stripe_payment_intent_id`, `stripe_subscription_id`, `amount`, `tier_purchased`, `status`, `created_at`, `updated_at`

- `routes/payments.mjs` with these endpoints:
  - `POST /api/payments/create-checkout` — creates Stripe Checkout Session and returns the `url`
  - `POST /api/payments/webhook` — Stripe webhook handler (critical)
  - `GET /api/payments/history/:customerId` — returns payment + subscription history
  - (Optional) `GET /api/payments/status/:customerId` — current subscription status

**Key logic on successful payment (via webhook `checkout.session.completed` or `invoice.paid`):**
- Update customer `tier`
- Set `license_status = 'active'`
- Record the payment
- Store `stripe_subscription_id` for future management

---

#### **Step 2 — Frontend: change-tier.html**

- Replace the stub "Continue to Payment" button with a real handler.
- On tier selection + click:
  - Call `POST /api/payments/create-checkout` with selected tier/priceId
  - Redirect user to the `url` returned by Stripe (Stripe Checkout hosted page)
- Optional: Show nice tier cards with annual pricing clearly labeled (e.g., “$49 billed yearly”)

This is much cleaner than PayPal buttons.

---

#### **Step 3 — Frontend: payment-confirm.html**

- Read `session_id` from URL query param
- Call your backend to verify the session status (or rely primarily on webhook)
- Show clear success message: “Thank you! Your [Tier] plan is now active.”
- Show failure / error cases gracefully
- Button to go to “My Account”

**Important**: The actual tier upgrade and record creation should happen in the **webhook**, not on this page (more reliable).

---

#### **Step 4 — Payment History**

- Wire up the existing button on `my-account.html`
- Fetch from `GET /api/payments/history/:customerId`
- Display: Date, Tier, Amount, Status, Stripe Receipt link (optional but nice)

---

### Additional Important Recommendations

1. **Webhooks are mandatory**  
   Listen to at least these events:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated` / `deleted` (for future)

2. **Idempotency & Safety**  
   Make webhook handlers idempotent using Stripe event IDs or subscription IDs.

3. **Customer Object**  
   Create or retrieve a Stripe Customer linked to your `customer_id` for better tracking.

4. **Security**  
   Never expose secret keys on frontend.  
   Validate webhook signatures.

5. **Future-Proofing**  
   Keep the service modular (`paymentsService`) so you can easily add PayPal later if needed.

---

### Next Actions – What Do You Want Now?

Tell me how you want to proceed:

**Option A (Fastest)**: I give you the complete code structure + key files (`stripeService.mjs`, routes, table schema, webhook handler).

**Option B**: We start with **Step 1 only** — detailed backend implementation first.

**Option C**: First, I give you the exact Stripe Dashboard setup steps + recommended metadata to attach to prices/sessions.

Would you like me to start by providing:
- The database schema + `stripeService.mjs` skeleton, or
- The full revised plan with code examples for the most important parts?

Just say what you'd like first (e.g., "Give me the backend Step 1 in detail").