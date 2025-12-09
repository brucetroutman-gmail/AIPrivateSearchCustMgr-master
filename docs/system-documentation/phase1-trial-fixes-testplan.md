# Phase 1: Trial Fixes - Implementation & Test Plan

## Implementation Tasks

### Task 1.1: Update Database Schema
**File**: `server/s01_server-first-app/lib/database/init.mjs`

**Changes**:
- Add `trial_started_at` column to licenses table
- Modify `status` enum to include 'trial'
- Add migration logic for existing data

**SQL**:
```sql
ALTER TABLE licenses 
  ADD COLUMN trial_started_at TIMESTAMP NULL AFTER created_at,
  MODIFY COLUMN status ENUM('trial', 'active', 'expired', 'suspended', 'cancelled') DEFAULT 'trial';
```

---

### Task 1.2: Update Trial Period (60→30 days)
**File**: `server/s01_server-first-app/lib/customers/customerManager.mjs`

**Changes**:
- Change trial period from 60 to 30 days in `verifyEmail()` method
- Set status to 'trial' instead of 'active'
- Add `trial_started_at` timestamp

**Before**:
```javascript
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 60);
```

**After**:
```javascript
const trialStartedAt = new Date();
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 30);
status = 'trial'
```

---

### Task 1.3: Add Download Link Configuration
**File**: `.env-custmgr`

**Add**:
```bash
# AIPS Installer
AIPS_DOWNLOAD_URL=https://downloads.aiprivatesearch.com/installer/latest
AIPS_DOWNLOAD_FILENAME=AIPrivateSearch-Installer.dmg
```

---

### Task 1.4: Update Verification Response
**File**: `server/s01_server-first-app/routes/customers.mjs`

**Changes**:
- Add download URL to verification response
- Include trial expiration date
- Add trial status indicator

**Response**:
```javascript
{
  success: true,
  customerId: result.customerId,
  licenseKey: result.licenseKey,
  tier: 'trial',
  status: 'trial',
  trialStartedAt: result.trialStartedAt,
  expiresAt: result.expiresAt,
  daysRemaining: 30,
  downloadUrl: process.env.AIPS_DOWNLOAD_URL,
  message: 'Email verified! Your 30-day trial has started.'
}
```

---

### Task 1.5: Update Verification Success Screen
**File**: `client/c01_client-first-app/customer-registration.html`

**Changes**:
- Add download button with prominent styling
- Display trial period (30 days)
- Show expiration date
- Add activation instructions

**UI Elements**:
- Large "Download AIPrivateSearch" button
- Trial info card with countdown
- License key with copy button
- Step-by-step activation guide

---

### Task 1.6: Create Welcome Email
**File**: `server/s01_server-first-app/lib/email/emailService.mjs`

**Add Method**: `sendWelcomeEmail(email, licenseKey, expiresAt, downloadUrl)`

**Email Content**:
- Welcome message
- Trial period info (30 days)
- Download link (prominent button)
- License key
- Activation instructions
- Expiration date
- Upgrade CTA

---

### Task 1.7: Send Welcome Email After Verification
**File**: `server/s01_server-first-app/routes/customers.mjs`

**Changes**:
- Call `emailService.sendWelcomeEmail()` after successful verification
- Include all trial details
- Handle email failure gracefully (log but don't block)

---

## Test Plan

### Pre-Test Setup
1. **Database**: Ensure aiprivatesearch database is accessible
2. **Email**: Verify aiprivatesearch@gmail.com credentials in .env-custmgr
3. **Server**: Start custmgr server on port 56304
4. **Browser**: Open http://localhost:56303/customer-registration.html

---

### Test Case 1: Database Schema Update
**Objective**: Verify licenses table has new columns

**Steps**:
1. Connect to MySQL database
2. Run: `DESCRIBE aiprivatesearch.licenses;`
3. Verify `trial_started_at` column exists (TIMESTAMP NULL)
4. Verify `status` enum includes 'trial'

**Expected Result**:
```
status: enum('trial','active','expired','suspended','cancelled')
trial_started_at: timestamp NULL
```

**Pass Criteria**: ✅ Both columns present with correct types

---

### Test Case 2: New Customer Registration (30-Day Trial)
**Objective**: Verify new customers get 30-day trial

**Steps**:
1. Navigate to customer-registration.html
2. Fill form with test data:
   - Email: test-trial@example.com
   - Phone: 555-1234
   - City: TestCity
   - State: TS
   - Postal: 12345
3. Click "Register"
4. Check email for verification code
5. Enter 6-digit code
6. Click "Verify"

**Expected Result**:
- Success message: "Email verified! Your 30-day trial has started."
- License key displayed
- Download button visible
- Trial info shows: "30 days remaining"
- Expiration date = today + 30 days

**Database Verification**:
```sql
SELECT customer_code, tier, status, trial_started_at, expires_at, created_at
FROM licenses 
WHERE customer_id = (SELECT id FROM customers WHERE email = 'test-trial@example.com');
```

**Expected**:
- tier: 1 (Standard)
- status: 'trial'
- trial_started_at: current timestamp
- expires_at: 30 days from now

**Pass Criteria**: ✅ Trial period is exactly 30 days, status is 'trial'

---

### Test Case 3: Download Link Display
**Objective**: Verify download link is shown after verification

**Steps**:
1. Complete Test Case 2 (registration + verification)
2. Observe verification success screen

**Expected Result**:
- "Download AIPrivateSearch" button visible
- Button is prominent (large, gold/blue color)
- Button links to: process.env.AIPS_DOWNLOAD_URL
- Download instructions displayed

**Pass Criteria**: ✅ Download button present and functional

---

### Test Case 4: Welcome Email Sent
**Objective**: Verify welcome email is sent with trial details

**Steps**:
1. Complete Test Case 2 (registration + verification)
2. Check email inbox for test-trial@example.com
3. Open welcome email

**Expected Email Content**:
- Subject: "Welcome to AI Private Search - Your Trial Has Started"
- Welcome message
- Trial period: "30 days"
- Download link (clickable button)
- License key displayed
- Activation instructions (step-by-step)
- Expiration date clearly shown
- "Upgrade Now" CTA button

**Pass Criteria**: ✅ Email received with all required elements

---

### Test Case 5: License Key Format
**Objective**: Verify license key is valid format

**Steps**:
1. Complete Test Case 2
2. Copy license key from success screen
3. Verify format

**Expected Result**:
- License key = customer_code (32-character hex string)
- Format: lowercase hex (0-9a-f)
- Length: 32 characters
- Example: `a1b2c3d4e5f6789012345678901234ab`

**Pass Criteria**: ✅ License key matches expected format

---

### Test Case 6: Trial Expiration Date Calculation
**Objective**: Verify expiration date is exactly 30 days from trial start

**Steps**:
1. Complete Test Case 2
2. Note trial_started_at timestamp
3. Note expires_at timestamp
4. Calculate difference

**Expected Result**:
- Difference = exactly 30 days (2,592,000 seconds)
- expires_at = trial_started_at + 30 days

**Database Query**:
```sql
SELECT 
  trial_started_at,
  expires_at,
  DATEDIFF(expires_at, trial_started_at) as days_difference
FROM licenses 
WHERE customer_id = (SELECT id FROM customers WHERE email = 'test-trial@example.com');
```

**Expected**: days_difference = 30

**Pass Criteria**: ✅ Exactly 30 days between start and expiration

---

### Test Case 7: Existing Customer (Already Registered)
**Objective**: Verify existing customers cannot re-register

**Steps**:
1. Use email from Test Case 2: test-trial@example.com
2. Try to register again with same email
3. Observe error message

**Expected Result**:
- Error: "Email already registered. Please verify your email or contact support."
- No new license created
- No verification email sent

**Pass Criteria**: ✅ Duplicate registration prevented

---

### Test Case 8: Copy License Key Button
**Objective**: Verify license key can be copied to clipboard

**Steps**:
1. Complete Test Case 2
2. Click "Copy License Key" button
3. Paste into text editor

**Expected Result**:
- License key copied to clipboard
- Success message: "License key copied!"
- Pasted value matches displayed license key

**Pass Criteria**: ✅ Copy functionality works

---

### Test Case 9: Multiple Registrations (Different Emails)
**Objective**: Verify multiple customers can register independently

**Steps**:
1. Register customer 1: trial1@example.com
2. Register customer 2: trial2@example.com
3. Register customer 3: trial3@example.com
4. Verify each gets unique license

**Expected Result**:
- Each customer has unique customer_code
- Each has separate license record
- All have 30-day trial
- All have status = 'trial'

**Database Query**:
```sql
SELECT c.email, l.customer_code, l.status, l.expires_at
FROM customers c
JOIN licenses l ON c.id = l.customer_id
WHERE c.email IN ('trial1@example.com', 'trial2@example.com', 'trial3@example.com');
```

**Pass Criteria**: ✅ 3 unique licenses, all with 'trial' status

---

### Test Case 10: Email Service Failure Handling
**Objective**: Verify registration succeeds even if email fails

**Steps**:
1. Temporarily break email service (wrong password in .env)
2. Complete registration and verification
3. Check if license is still created

**Expected Result**:
- Verification succeeds
- License created with 30-day trial
- Error logged: "Failed to send welcome email"
- User sees success message
- Download link still displayed

**Pass Criteria**: ✅ Registration completes despite email failure

---

## Success Criteria Summary

### Must Pass (Critical)
- ✅ Test Case 2: 30-day trial period
- ✅ Test Case 3: Download link displayed
- ✅ Test Case 4: Welcome email sent
- ✅ Test Case 6: Expiration date correct

### Should Pass (Important)
- ✅ Test Case 1: Database schema updated
- ✅ Test Case 5: License key format valid
- ✅ Test Case 7: Duplicate prevention
- ✅ Test Case 8: Copy functionality

### Nice to Have (Enhancement)
- ✅ Test Case 9: Multiple registrations
- ✅ Test Case 10: Email failure handling

---

## Rollback Plan

If tests fail:

1. **Database Rollback**:
```sql
ALTER TABLE licenses 
  DROP COLUMN trial_started_at,
  MODIFY COLUMN status ENUM('active', 'expired', 'suspended', 'cancelled') DEFAULT 'active';
```

2. **Code Rollback**:
- Revert customerManager.mjs to 60-day period
- Remove welcome email functionality
- Remove download link from UI

3. **Verification**:
- Test existing registration flow
- Confirm 60-day licenses still work

---

## Post-Implementation Checklist

- [ ] All 10 test cases passed
- [ ] Database schema updated on dev and production
- [ ] .env-custmgr updated with AIPS_DOWNLOAD_URL
- [ ] Welcome email template reviewed and approved
- [ ] Download link tested and accessible
- [ ] Documentation updated (README.md)
- [ ] Changes committed to git
- [ ] Deployed to Ubuntu server
- [ ] Production smoke test completed

---

**Version**: 1.0  
**Created**: December 2024  
**Status**: Ready for Implementation
