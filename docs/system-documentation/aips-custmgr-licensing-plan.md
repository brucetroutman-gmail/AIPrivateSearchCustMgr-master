# CustMgr Full Customer Management Implementation Plan

## **Phase 1: Database Foundation** ✅ COMPLETE

### **1.1 Database Schema Design** ✅
- **customers** table: id, email, phone, city, state, postal_code, customer_code, customer_ipaddr, password_hash, role, active, email_verified, verification_code, verification_expires, reset_token, reset_expires, tier, license_status, trial_started_at, expires_at, grace_period_ends, created_at
- **devices** table: id, customer_id, device_id, device_uuid, hw_hash, device_name, device_info, pc_code, ip_address, status, registered_at, first_seen, last_seen
- **activation_attempts** table: email, hw_hash, ip_address, attempts, last_attempt, success
- **revocation_list** table: token_hash, customer_id, reason
- **users** table (admin/manager auth): id, email, password_hash, first_name, last_name, role, status, created_at, updated_at
- **sessions** table: id, user_id, session_token, expires_at, ip_address, user_agent, created_at
- **activity_logs** table: id, user_id, action, details, ip_address, created_at

### **1.2 Database Setup** ✅
- MySQL schema with foreign keys and cascading deletes
- Connection pooling via mysql2/promise
- Database initialization on startup (lib/database/init.mjs, connection.mjs)

## **Phase 2: Core Customer Management** ✅ COMPLETE

### **2.1 Customer Registration & Onboarding** ✅
- Email validation and duplicate prevention
- 6-digit email verification code with 15-minute expiry
- Password validation (8+ chars, uppercase, lowercase, number)
- 60-day Standard tier trial on email verification
- Welcome email with license key and download link
- Customer profile fields: email, phone, city, state, postal code, IP address

### **2.2 Device Management** ✅
- Hardware fingerprinting via SHA-256 hash of hwId
- Device registration with name, UUID, pc_code, IP address
- Device limit enforcement per tier (Standard: 2, Premium: 5, Professional: 10)
- Device deactivation and status tracking (active/revoked)
- Last-seen tracking on validation
- Device deletion by customer (own devices) or admin

### **2.3 License Validation** ✅
- Device-based licensing (no JWT tokens)
- Device registration via email + deviceUuid + deviceName + pcCode
- Device validation checks: customer exists, email verified, license status (trial/active), not expired, device registered
- Last-seen tracking updated on each validation
- Tier helpers: getTierName, getTierFeatures, getMaxDevices (tier-helpers.mjs)

## **Phase 3: Subscription Management** 🔶 PARTIAL

### **3.1 Stripe Integration** ❌ NOT STARTED
- Stripe webhook handlers
- Payment method management
- Invoice generation
- Failed payment retry logic

### **3.2 Tier Management** ✅
- Three tiers implemented: Standard (1), Premium (2), Professional (3)
- Feature access per tier:
  - Standard: search, collections
  - Premium: search, multi-mode, collections, models
  - Professional: search, multi-mode, collections, models, config, doc-index
- Admin can update customer tier and license status
- Customers can upgrade their own tier
- License statuses: trial, active, expired, suspended, cancelled

### **3.3 Trial & Expiration Handling** ✅
- 60-day free trial on registration (Standard tier)
- Trial expiration email notifications (7 days, 3 days, 1 day before)
- Grace period handling (7 days after expiration)
- Grace period email notification
- Expiration enforcement on activation and validation

### **3.4 Billing & Invoicing** ❌ NOT STARTED
- Automated recurring billing
- Invoice email delivery
- Payment failure notifications
- Subscription renewal reminders

## **Phase 4: Admin Dashboard** ✅ COMPLETE

### **4.1 Customer Management UI** ✅
- Customer list with search and filtering (customer-management.html)
- Customer detail view with license info (customer-edit.html)
- Device management per customer
- Admin can update customer profile, tier, license status, expiration
- Customer deactivation (soft delete)

### **4.2 Admin Auth & User Management** ✅
- Admin/manager login with session-based auth
- User CRUD (admin only): create, list, update, delete
- Role-based access: admin (full access), manager (customer management)
- Two default admin accounts auto-created on first run
- Session management with token-based auth (Bearer token)

### **4.3 Analytics & Reporting** ❌ NOT STARTED
- Revenue metrics and trends
- Customer lifecycle analytics
- Device usage statistics
- Churn analysis

### **4.4 Support Tools** 🔶 PARTIAL
- ✅ License reset scripts (scripts/reset-customer-license.mjs)
- ✅ Customer deletion script (scripts/delete-customer.mjs)
- ✅ Rate limit clearing script (scripts/clear-rate-limits.mjs)
- ✅ Token inspection script (scripts/check-token.mjs)
- ✅ Schema fix script (scripts/fix-licensing-schema.mjs)
- ❌ Customer support ticket integration
- ❌ Bulk operations (refunds, upgrades)
- ❌ Fraud detection

## **Phase 5: API Enhancement** ✅ MOSTLY COMPLETE

### **5.1 Implemented API Endpoints** ✅

**Authentication (routes/auth.mjs)**
- `POST /api/auth/login` - Admin/manager login
- `POST /api/auth/logout` - Logout with session destroy
- `GET /api/auth/me` - Current user info
- `POST /api/auth/register` - Create new admin/manager (admin only)
- `GET /api/auth/users` - List all users (admin only)
- `PUT /api/auth/users/:userId` - Update user
- `DELETE /api/auth/users/:userId` - Delete user (admin only)

**Customer Management (routes/customers.mjs)**
- `POST /api/customers/register` - Public customer registration
- `POST /api/customers/verify-email` - Email verification
- `POST /api/customers/forgot-password` - Password reset request
- `POST /api/customers/reset-password` - Password reset with code
- `POST /api/customers/login` - Customer login validation
- `GET /api/customers` - List all customers (admin/manager)
- `GET /api/customers/with-licenses` - Customers with license details (admin/manager)
- `GET /api/customers/:id` - Get customer by ID
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Deactivate customer (admin/manager)
- `GET /api/customers/:id/license` - Customer license info
- `GET /api/customers/:id/devices` - Customer devices

**Licensing (routes/licensing.mjs)**
- `POST /api/licensing/activate` - License activation with device binding
- `POST /api/licensing/refresh` - Token refresh
- `POST /api/licensing/validate` - Token validation
- `POST /api/licensing/revoke` - Token revocation
- `GET /api/licensing/public-key` - Public key for local validation
- `GET /api/licensing/check-limits` - Check device limits before activation
- `POST /api/licensing/register-device` - Device registration without JWT
- `POST /api/licensing/validate-device` - Device validation without JWT
- `GET /api/licensing/status` - Service health check

**Devices (routes/devices.mjs)**
- `DELETE /api/devices/:deviceId` - Delete device (owner or admin)

### **5.2 Security & Middleware** ✅
- Rate limiting on activation endpoint (5 per 5 minutes)
- Input validation via express-validator
- Session-based auth middleware (requireAuth)
- Role-based access control (requireRole)
- CSRF protection middleware
- Error handling middleware
- bcrypt password hashing (12 rounds)

## **Phase 6: Email System** ✅ COMPLETE

### **6.1 Transactional Emails** ✅
- Email verification code
- Welcome email with license key and download link
- Trial expiration warnings (7, 3, 1 day)
- Grace period notification
- Password reset code
- Password reset confirmation
- Test email endpoint
- Nodemailer with SMTP (Gmail) transport

## **Phase 7: Integration & Testing** 🔶 PARTIAL

### **7.1 AIPrivateSearch Integration** ✅
- License activation flow: email → verify → JWT token → device binding
- Device registration and validation endpoints (with and without JWT)
- Public key distribution for client-side local validation
- License status check on every activation/validation

### **7.2 Testing & Quality Assurance** ❌ NOT STARTED
- Unit tests
- Integration tests for licensing workflows
- Load testing
- Security penetration testing

### **7.3 Deployment** 🔶 PARTIAL
- ✅ Pre-commit security hook (ESLint + security checks)
- ✅ Security validation script (banned patterns, secret detection)
- ❌ CI/CD pipeline
- ❌ Health monitoring and alerting
- ❌ Backup and disaster recovery

## **Technical Architecture**

### **Technology Stack (Implemented)**
- **Backend**: Node.js/Express (ESM modules, .mjs)
- **Database**: MySQL with mysql2/promise connection pooling
- **Authentication**: Session-based (admin), JWT RS256 (licensing)
- **Email**: Nodemailer with SMTP
- **Security**: bcrypt, express-rate-limit, express-validator, Helmet, CORS
- **Frontend**: Static HTML/CSS/JS served by Express

### **Key Design Patterns (Implemented)**
- **Service Layer**: LicensingService, CustomerManager, EmailService, TrialNotificationService
- **Unified Auth**: UnifiedUserManager handles both admin and customer auth
- **Middleware Chain**: auth → role check → route handler
- **Device Licensing**: Registration + validation without JWT tokens

### **Tier Structure**
- **Standard (Tier 1)**: 2 devices, features: search, collections
- **Premium (Tier 2)**: 5 devices, features: search, multi-mode, collections, models
- **Professional (Tier 3)**: 10 devices, features: search, multi-mode, collections, models, config, doc-index
- **Trial**: 60 days free Standard tier on registration

## **Remaining Work (Priority Order)**

1. **Stripe Integration** — Payment processing, subscription lifecycle, webhooks
2. **Billing & Invoicing** — Recurring billing, invoices, payment failure handling
3. **Analytics & Reporting** — Revenue metrics, customer lifecycle, usage stats
4. **Testing** — Unit tests, integration tests, load testing
5. **CI/CD & Monitoring** — Deployment pipeline, health checks, alerting, backups
6. **Advanced Support Tools** — Ticket integration, bulk operations, fraud detection
