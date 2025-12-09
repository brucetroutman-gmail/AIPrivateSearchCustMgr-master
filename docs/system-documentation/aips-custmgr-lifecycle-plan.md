# AIPrivateSearch Customer Manager Implementation Plan

## Current Status (v1.28)

### ✅ Completed Infrastructure
- Admin authentication with 5-minute session timeout
- User management (admin/manager roles)
- Dual database architecture (aiprivatesearchcustmgr + aiprivatesearch)
- Email service with verification codes (aiprivatesearch@gmail.com)
- Customer registration with email verification
- License creation (currently 60-day Standard tier)
- JWT token generation with tier info and device limits
- Device tracking table (2/5/10 device limits per tier)
- License activation endpoint (`/api/licensing/activate`)
- Token validation and refresh (24hr access, 30-day refresh)

### ❌ Missing Critical Components

**Customer Journey**
- Trial period is 60 days (should be 30 days)
- Trial status not properly set (using Standard tier instead)
- No download link provided after registration
- No welcome email with trial details and download link

**Payment Processing**
- No PayPal integration
- No subscription tier selection UI
- No payment processing workflow
- No upgrade path from trial to paid subscription

**Admin Dashboard**
- No customer list view
- No license management interface
- No device management UI
- No subscription status overview

**Customer Portal**
- No customer self-service login
- No "My Account" page
- No subscription management
- No payment method updates

## Implementation Phases

---

## Phase 1: Trial & Registration Fixes (v1.29-1.30)

### Priority: CRITICAL
**Goal**: Fix trial period and provide download links

### Tasks:

**1.1 Fix Trial Period**
- Change from 60-day to 30-day trial in customerManager.mjs
- Add trial status field to licenses table
- Set status to 'trial' instead of 'active' for new registrations
- Add trial_started_at timestamp

**1.2 Add Download Links**
- Define AIPS installer download URL in .env-custmgr
- Add download link to verification success screen
- Include download link in welcome email
- Add "Download AIPrivateSearch" button with clear instructions

**1.3 Welcome Email Enhancement**
- Send welcome email after successful verification
- Include: trial period info, download link, license key, activation instructions
- Add trial expiration date
- Include upgrade CTA

**1.4 Trial Expiration Tracking**
- Add trial expiration warnings (7 days, 3 days, 1 day)
- Email notifications for expiring trials
- Grace period handling (7 days after trial expires)

---

## Phase 2: PayPal Payment Integration (v1.31-1.33)

### Priority: HIGH
**Goal**: Enable subscription purchases via PayPal

### Tasks:

**2.1 PayPal Setup**
- Add PayPal SDK to dependencies
- Configure PayPal credentials in .env-custmgr:
  - PAYPAL_CLIENT_ID
  - PAYPAL_CLIENT_SECRET
  - PAYPAL_MODE (sandbox/live)
- Create PayPal service class (lib/payments/paypalService.mjs)

**2.2 Subscription Tier Selection**
- Create subscription plans page (subscription-plans.html)
- Display three tiers:
  - Standard: $49/year (1 device)
  - Premium: $199/year (5 devices)
  - Professional: $2999 one-time (unlimited devices)
- Add tier comparison table
- "Select Plan" buttons for each tier

**2.3 PayPal Checkout Flow**
- Create PayPal order on plan selection
- Redirect to PayPal for payment
- Handle PayPal return/cancel URLs
- Capture payment on success
- Update license tier and status in database

**2.4 Payment Processing**
- Create payments table:
  - id, customer_id, amount, currency, payment_method
  - paypal_order_id, paypal_payer_id, status
  - created_at, completed_at
- Add payment routes (routes/payments.mjs)
- POST /api/payments/create-order
- POST /api/payments/capture-order
- GET /api/payments/history

**2.5 License Upgrade Logic**
- Convert trial to paid subscription
- Update license tier (1→2→3)
- Set expiration date (1 year for Standard/Premium)
- Set status to 'active'
- Send confirmation email with receipt

---

## Phase 3: Admin Dashboard (v1.34-1.36)

### Priority: MEDIUM
**Goal**: Provide admin interface for customer/license management

### Tasks:

**3.1 Customer List View**
- Create customers dashboard page (customers.html)
- Display table: email, tier, status, devices, expires_at, created_at
- Add search/filter by email, tier, status
- Pagination (50 per page)
- Sort by date, tier, status

**3.2 Customer Detail View**
- Click customer → detail modal/page
- Show: contact info, license details, payment history, devices
- Display active devices with hardware IDs
- Show trial/subscription status timeline

**3.3 Admin Actions**
- Extend trial (add days)
- Upgrade tier (Standard→Premium→Professional)
- Suspend/reactivate license
- Add device slots
- Reset device bindings
- Send notification email

**3.4 License Management**
- View all licenses with filters
- Bulk actions (extend, suspend, email)
- Export customer list (CSV)
- License usage statistics

**3.5 Device Management**
- View all registered devices
- Device details: hardware ID, last seen, status
- Revoke device access
- Transfer device to different customer

---

## Phase 4: Customer Self-Service Portal (v1.37-1.39)

### Priority: MEDIUM
**Goal**: Allow customers to manage their own accounts

### Tasks:

**4.1 Customer Login System**
- Separate customer authentication (different from admin)
- Customer login page (customer-login.html)
- Email-based login (no password initially)
- Magic link authentication via email
- Session management (30-minute timeout)

**4.2 My Account Page**
- Dashboard showing: current tier, devices used, expiration date
- License key display with copy button
- Download link for AIPS installer
- Subscription status and renewal date

**4.3 Subscription Management**
- View current plan details
- Upgrade/downgrade options
- Renewal settings
- Cancel subscription (with confirmation)
- Reactivate suspended subscription

**4.4 Payment Management**
- View payment history
- Update payment method (PayPal)
- Download receipts/invoices
- Set up auto-renewal

**4.5 Device Management**
- View registered devices
- Device nicknames (e.g., "Work Laptop", "Home Desktop")
- Deactivate device remotely
- Transfer license to new device

---

## Phase 5: Notifications & Automation (v1.40-1.41)

### Priority: LOW
**Goal**: Automated customer communications

### Tasks:

**5.1 Email Notifications**
- Trial expiration warnings (7, 3, 1 day)
- Subscription renewal reminders (30, 7, 1 day)
- Payment failure notifications
- Successful payment confirmations
- License activation confirmations
- Device limit reached warnings

**5.2 Automated Workflows**
- Trial-to-paid conversion emails
- Abandoned cart recovery (started checkout, didn't complete)
- Upgrade incentives (Standard→Premium)
- Renewal discounts
- Referral program emails

**5.3 Admin Notifications**
- New customer registrations
- Failed payments requiring attention
- Subscription cancellations
- High-value customer upgrades
- Daily/weekly revenue reports

---

## Phase 6: Analytics & Reporting (v1.42+)

### Priority: LOW
**Goal**: Business intelligence and metrics

### Tasks:

**6.1 Conversion Metrics**
- Trial signup rate
- Trial-to-paid conversion rate
- Average time to conversion
- Tier distribution (Standard/Premium/Professional)
- Revenue by tier

**6.2 Customer Lifecycle**
- Customer lifetime value (CLV)
- Churn rate by tier
- Retention rate
- Upgrade/downgrade patterns
- Device usage patterns

**6.3 Revenue Analytics**
- Monthly recurring revenue (MRR)
- Annual recurring revenue (ARR)
- Revenue by tier
- Payment success/failure rates
- Refund rates

**6.4 Dashboard Visualizations**
- Charts: revenue trends, customer growth, tier distribution
- KPI cards: total customers, active licenses, MRR, conversion rate
- Real-time metrics
- Export reports (PDF/CSV)

---

## Technical Requirements

### Environment Variables (.env-custmgr)
```bash
# PayPal Configuration
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_secret
PAYPAL_MODE=sandbox  # or 'live' for production

# AIPS Installer
AIPS_DOWNLOAD_URL=https://downloads.aiprivatesearch.com/installer/latest

# Trial Settings
TRIAL_PERIOD_DAYS=30
GRACE_PERIOD_DAYS=7

# Pricing
STANDARD_PRICE=49.00
PREMIUM_PRICE=199.00
PROFESSIONAL_PRICE=2999.00
```

### Database Schema Updates

**licenses table modifications:**
```sql
ALTER TABLE licenses 
  ADD COLUMN trial_started_at TIMESTAMP NULL,
  ADD COLUMN grace_period_ends TIMESTAMP NULL,
  MODIFY COLUMN status ENUM('trial', 'active', 'expired', 'suspended', 'cancelled');
```

**payments table:**
```sql
CREATE TABLE payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  license_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50) DEFAULT 'paypal',
  paypal_order_id VARCHAR(255),
  paypal_payer_id VARCHAR(255),
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (license_id) REFERENCES licenses(id)
);
```

### API Endpoints Summary

**Customer Registration:**
- POST /api/customers/register
- POST /api/customers/verify-email
- GET /api/customers/download-link

**Payments:**
- POST /api/payments/create-order
- POST /api/payments/capture-order
- GET /api/payments/history/:customerId
- POST /api/payments/webhook

**Admin:**
- GET /api/admin/customers (list with filters)
- GET /api/admin/customers/:id (detail)
- PUT /api/admin/customers/:id/extend-trial
- PUT /api/admin/customers/:id/upgrade-tier
- PUT /api/admin/customers/:id/suspend
- GET /api/admin/devices
- DELETE /api/admin/devices/:id

**Customer Portal:**
- POST /api/customer-auth/login
- GET /api/customer-auth/me
- GET /api/customer/account
- PUT /api/customer/subscription
- GET /api/customer/devices
- DELETE /api/customer/devices/:id

---

## Success Metrics

### Phase 1 Success Criteria
- 30-day trial properly set for new registrations
- Download link provided in verification email
- Welcome email sent with trial info

### Phase 2 Success Criteria
- PayPal checkout flow working end-to-end
- Successful payment upgrades trial to paid license
- Payment confirmation email sent
- License tier and expiration updated correctly

### Phase 3 Success Criteria
- Admin can view all customers and licenses
- Admin can perform common actions (extend, upgrade, suspend)
- Device management functional

### Phase 4 Success Criteria
- Customers can log in and view account
- Customers can manage devices
- Customers can upgrade subscription

---

## Timeline Estimate

- **Phase 1**: 2-3 days (critical fixes)
- **Phase 2**: 5-7 days (PayPal integration)
- **Phase 3**: 4-5 days (admin dashboard)
- **Phase 4**: 5-6 days (customer portal)
- **Phase 5**: 3-4 days (notifications)
- **Phase 6**: 4-5 days (analytics)

**Total**: 23-30 days for complete implementation

---

## Next Immediate Steps

1. **Fix trial period** (60→30 days)
2. **Add download link** to verification flow
3. **Send welcome email** with trial details
4. **Set up PayPal sandbox** account
5. **Create subscription plans page**
6. **Implement PayPal checkout flow**

---

**Version:** 1.0  
**Last Updated:** December 2024  
**Status:** Planning Phase  
**Current Version:** v1.28
