# AIPrivateSearch Customer Lifecycle Management

## Overview

This document defines the unified customer journey and terminology for AIPrivateSearch across all acquisition channels, ensuring seamless integration between the marketing website (aipsweb), customer management system (custmgr), and the core application (aiprivatesearch).

## Customer Acquisition Paths

### Path 1: Web-First Journey (aipsweb → custmgr → aiprivatesearch)

**Flow:**
1. **Discovery** → User visits aiprivatesearch.com marketing site
2. **"Get Started"** → Clicks primary CTA button
3. **"Create Account"** → Registers in CustMgr system
4. **"Choose Plan"** → Selects Standard ($49/yr), Premium ($199/yr), or Professional ($2999)
5. **"Complete Purchase"** → Processes payment via Stripe integration
6. **"Download Software"** → Receives AIPrivateSearch installer link
7. **"Activate License"** → Enters email to link purchase with installation

### Path 2: Software-First Journey (Direct Download → Trial → Purchase)

**Flow:**
1. **"Download & Install"** → User gets AIPrivateSearch directly
2. **"Start Free Trial"** → 30-day evaluation period begins
3. **"Upgrade Account"** → Redirected to CustMgr for subscription purchase
4. **"Complete Purchase"** → Processes payment and creates account
5. **"Activate License"** → Email automatically links trial to paid account

## Customer States

### Prospect States
- **Visitor** → Browsing aipsweb, not registered
- **Interested** → Downloaded materials, watching videos
- **Evaluating** → Comparing features and pricing

### Trial States  
- **Trial User** → Downloaded app, using 30-day evaluation
- **Trial Expiring** → 7 days or less remaining
- **Trial Expired** → Evaluation period ended, requires purchase

### Customer States
- **Registered** → Has CustMgr account, may not have purchased
- **Licensed** → Active paid subscription, software activated
- **Expired** → Subscription lapsed, within grace period
- **Suspended** → Beyond grace period, requires renewal

## License States

### Technical States
- **Unactivated** → No license activation attempted
- **Trial** → 30-day evaluation (no payment required)
- **Active** → Valid paid subscription with current payment
- **Expired** → Past due but within 7-day grace period
- **Suspended** → Beyond grace period, features restricted
- **Hardware Mismatch** → License activated on different device

### Grace Period Handling
- **7-Day Grace** → Full functionality maintained after expiration
- **Grace Expired** → Limited to view-only mode
- **Reactivation** → Full functionality restored upon payment

## User-Facing Terminology

### Primary Actions
| Context | Button Text | Destination | Purpose |
|---------|-------------|-------------|---------|
| aipsweb | "Get Started" | CustMgr Registration | Lead conversion |
| aipsweb | "Download Free Trial" | Direct installer | Trial acquisition |
| App | "Activate License" | Email entry form | License linking |
| App | "Upgrade Plan" | CustMgr billing | Tier upgrade |
| App | "Renew License" | CustMgr payment | Subscription renewal |

### Status Messages
| State | Message | Action Available |
|-------|---------|------------------|
| Trial Active | "X days remaining in your free trial" | "Upgrade Now" |
| License Required | "Please activate your license to continue" | "Enter Email" |
| Subscription Active | "Your [Tier] plan is active until [Date]" | "Manage Account" |
| Payment Due | "Please update your payment method" | "Update Payment" |
| Grace Period | "Subscription expired - X days remaining" | "Renew Now" |

## Integration Architecture

### CustMgr Responsibilities
- Customer registration and authentication
- Subscription management and billing
- Payment processing via Stripe
- License token generation and validation
- Device limit enforcement
- Subscription tier management

### AIPrivateSearch Responsibilities  
- License activation via email
- Hardware fingerprinting and binding
- Feature restriction based on tier
- Local license caching (72-hour)
- Grace period enforcement
- Trial period management

### aipsweb Responsibilities
- Lead generation and conversion
- Feature demonstration and education
- Pricing presentation and comparison
- Direct download facilitation
- CustMgr registration funnel

## Subscription Tiers

### Standard Tier ($49/year)
- **Device Limit:** 1 computer
- **Features:** Search, multi-mode, collections, options, dark mode
- **Users:** Admin can add searcher users
- **Restrictions:** Cannot modify doc index cards, limited model parameters

### Premium Tier ($199/year)  
- **Device Limit:** 5 computers
- **Features:** All Standard features plus model management, config editing, doc index modification
- **Users:** Multiple admin and searcher roles
- **Advanced:** Custom configurations and advanced settings

### Professional Tier ($2999 license)
- **Device Limit:** Unlimited
- **Features:** All menu items and functionality unlocked
- **Support:** Priority support, no usage emails
- **Enterprise:** Full API access and customization

## Technical Implementation

### License Validation Flow
1. **Hardware Check** → Generate system UUID/serial composite ID
2. **Local Validation** → Check cached JWT token with public key
3. **Remote Validation** → Fallback to CustMgr API validation
4. **Grace Period** → Allow 7-day continued access after expiration
5. **Feature Gating** → Hide/show UI elements based on tier

### API Endpoints
- `POST /api/licensing/activate` → Email-based license activation
- `POST /api/licensing/validate` → Token validation and refresh
- `GET /api/licensing/status` → Current license status check
- `POST /api/licensing/refresh` → Token refresh for expiring licenses

### Error Handling
- **Network Failure** → Graceful degradation to cached license
- **Invalid License** → Clear messaging with activation options
- **Hardware Mismatch** → Device transfer or additional license options
- **Payment Failure** → Grace period with payment update prompts

## Success Metrics

### Conversion Tracking
- **Web-to-Trial** → aipsweb visitors who download
- **Trial-to-Paid** → Trial users who purchase subscriptions  
- **Activation Rate** → Downloaded users who activate licenses
- **Retention Rate** → Customers who renew subscriptions

### Customer Lifecycle KPIs
- **Time to Activation** → Download to first license activation
- **Trial Conversion** → Percentage of trials that become paid
- **Churn Rate** → Monthly subscription cancellation rate
- **Upgrade Rate** → Standard to Premium/Professional upgrades

---

**Version:** 1.0 | **Last Updated:** December 2024 | **Applies To:** aiprivatesearch v19.82+, custmgr v1.22+, aipsweb v1.0+