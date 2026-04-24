# AIPS Remote License Server Testing Plan v1.50

Testing AI Private Search device-based licensing using remote Ubuntu server (custmgr.aiprivatesearch.com) with AIPS client running on Mac.

## Test Environment

- **License Server**: Ubuntu server at custmgr.aiprivatesearch.com (ports 56303/56304)
- **AIPS Client**: Mac running aiprivatesearch.com application
- **Database**: MySQL on remote server
- **Network**: Internet connection required
- **Download**: DMG installer at https://aiprivatesearch.com/downloads/AIPrivateSearch.dmg
- **Licensing Flow**: Device-based (register-device / validate-device)

---

## Phase 1: Server Verification

### T1. Server Health Check
```bash
curl https://custmgr.aiprivatesearch.com/api/health
```
**Expected Response** (200):
```json
{"status":"healthy","timestamp":"2025-...","service":"aiprivatesearch-custmgr"}
```
**Error**: No response → Server down or firewall blocking port 56304

### T2. License Service Status
```bash
curl https://custmgr.aiprivatesearch.com/api/licensing/status
```
**Expected Response** (200):
```json
{"service":"AIPrivateSearch Licensing","status":"active","version":"1.0.0","timestamp":"...","database":{"connected":true,"customerCount":N}}
```
**Error — DB not connected**:
```json
{"service":"AIPrivateSearch Licensing","status":"error","version":"1.0.0","timestamp":"...","database":{"connected":false,"error":"..."}}
```

---

## Phase 2: Customer Registration

### T3. New Customer Registration
1. Navigate to: `https://custmgr.aiprivatesearch.com/customer-registration.html`
2. Fill form: email, phone, city, state, postal code, password
3. Click Register

**Expected Response** (200):
```json
{"success":true,"customerId":N,"requiresVerification":true,"message":"Registration successful. Please check your email for verification code."}
```

**Error — missing fields** (400):
```json
{"error":"All fields are required"}
```

**Error — duplicate email** (400):
```json
{"error":"Email already registered. Please verify your email or contact support."}
```

**Error — weak password** (400):
```json
{"error":"Password must be at least 8 characters with uppercase, lowercase, and number"}
```

### T4. Email Verification
1. Check email for 6-digit code
2. Enter code on verification page

**Expected Response** (200):
```json
{"success":true,"customerId":N,"licenseKey":"<hex-code>","tier":1,"expiresAt":"2025-...","message":"Email verified successfully. You have been granted 60 days free access to Standard tier."}
```

**Error — wrong code** (400):
```json
{"error":"Invalid verification code"}
```

**Error — expired code** (400):
```json
{"error":"Verification code expired"}
```

**Error — already verified** (400):
```json
{"error":"Email not found or already verified"}
```

### T5. Verify Customer via API
```bash
curl "https://custmgr.aiprivatesearch.com/api/licensing/check-limits?email=your-test-email@domain.com"
```
**Expected Response** (200):
```json
{"exists":true,"customerId":N,"tier":1,"tierName":"standard","maxDevices":2,"currentDevices":0,"availableSlots":2,"canActivate":true,"features":["search","collections"],"devices":[],"message":"2 device slot(s) available."}
```

**Error — unknown email**:
```json
{"exists":false,"message":"Customer not found. Please register first."}
```

---

## Phase 3: AIPS Client Device Activation

### T6. Download & Install AIPS
- Download from: `https://aiprivatesearch.com/downloads/AIPrivateSearch.dmg`
- Install on Mac

### T7. First Device Registration
1. In AIPS, enter registered email
2. Click Activate
3. AIPS calls `POST /api/licensing/register-device` with email, deviceUuid, deviceName, pcCode

**Expected Response** (200):
```json
{"success":true,"customer":{"email":"...","tier":1,"license_status":"trial"},"device":{"uuid":"<device-uuid>","name":"<serial>-<name>-<model>-<cpu>-<ram>-macOS <ver>","status":"active"}}
```
**End State**: AIPS shows Standard tier, search and collections enabled

**Error — unverified email** (400):
```json
{"success":false,"error":"Customer not found or email not verified"}
```

**Error — invalid input** (400):
```json
{"error":"Invalid input","details":[...]}
```

### T8. Device Validation
AIPS calls `POST /api/licensing/validate-device` on startup or periodically.

**Expected Response** (200):
```json
{"valid":true,"customer":{"email":"...","tier":1,"license_status":"trial","expires_at":"..."},"device":{"uuid":"<device-uuid>","name":"...","registered_at":"..."}}
```
**End State**: AIPS confirms license is valid, continues operating

**Error — unregistered device**:
```json
{"valid":false,"reason":"Device not registered"}
```

**Error — license not active**:
```json
{"valid":false,"reason":"License not active"}
```

**Error — license expired**:
```json
{"valid":false,"reason":"License expired"}
```

**Error — unknown customer**:
```json
{"valid":false,"reason":"Customer not found or email not verified"}
```

### T9. Re-registration (Same Device)
Activate again with same email and deviceUuid.

**Expected Response** (200): Same as T7 — existing device updated (last_seen, status reset to active)
**End State**: Device count unchanged, device info updated

### T10. Test AIPS Functionality
1. **Search** → Expected: works
2. **Collections** → Expected: works
3. **Multi-mode / Models** (Premium features) → Expected: restricted for Standard tier

---

## Phase 4: Device Limit Testing

### T11. Second Device Registration
```bash
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/register-device \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@domain.com","deviceUuid":"test-device-002-abcdef1234","deviceName":"Test Mac 2","pcCode":"TM0002"}'
```
**Expected Response** (200):
```json
{"success":true,"customer":{"email":"...","tier":1,"license_status":"trial"},"device":{"uuid":"test-device-002-abcdef1234","name":"Test Mac 2","status":"active"}}
```
**End State**: 2/2 devices used

### T12. Verify Device Limit via API
```bash
curl "https://custmgr.aiprivatesearch.com/api/licensing/check-limits?email=your-test-email@domain.com"
```
**Expected Response** (200):
```json
{"exists":true,"customerId":N,"tier":1,"tierName":"standard","maxDevices":2,"currentDevices":2,"availableSlots":0,"canActivate":false,"features":["search","collections"],"devices":[...],"message":"Device limit reached (2/2). Upgrade to premium tier for more devices."}
```
**End State**: canActivate is false, 0 available slots

Note: The `register-device` endpoint does not currently enforce device limits — it only registers devices. Limit enforcement happens at the AIPS client level via `check-limits`. Consider adding server-side enforcement in a future update.

---

## Phase 5: Admin Interface Testing

### T13. Admin Login
1. Navigate to: `https://custmgr.aiprivatesearch.com/login.html`
2. Login: `adm-custmgr@a.com` / `123`

**Expected Response** (200):
```json
{"success":true,"user":{"userId":N,"email":"adm-custmgr@a.com","userRole":"admin","userType":"user"},"sessionId":"<uuid>"}
```

**Error — wrong credentials** (401):
```json
{"error":"Invalid email or password"}
```

### T14. View Customer with Licenses
1. Go to Customer Management
2. Find test customer

**Expected**: Shows Standard tier, trial status, 2 devices, expiration date ~60 days out

### T15. Tier Upgrade (Standard → Premium)
1. Edit test customer
2. Change tier to Premium (2)
3. Save

**End State**: Customer shows Premium tier, device limit now 5, devices show 2/5

### T16. Delete Device via Admin
1. View customer devices
2. Delete one test device

**End State**: Device removed, device count decreases by 1

---

## Phase 6: Password Reset Flow

### T17. Request Password Reset
```bash
curl -X POST https://custmgr.aiprivatesearch.com/api/customers/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@domain.com"}'
```
**Expected Response** (200 — always, to prevent email enumeration):
```json
{"success":true,"message":"If the email exists, a reset code has been sent."}
```

### T18. Reset Password with Code
```bash
curl -X POST https://custmgr.aiprivatesearch.com/api/customers/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@domain.com","code":"123456","password":"NewPass456"}'
```
**Expected Response** (200):
```json
{"success":true,"message":"Password reset successfully. You can now log in with your new password."}
```

**Error — bad code** (400):
```json
{"error":"Invalid or expired reset code"}
```

**Error — weak password** (400):
```json
{"error":"Password must be at least 8 characters with uppercase, lowercase, and number"}
```

---

## Phase 7: Input Validation & Error Handling

### T19. Invalid Email Format
```bash
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/register-device \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email","deviceUuid":"test-device-abcdef1234"}'
```
**Expected Error** (400):
```json
{"error":"Invalid input","details":[{"type":"field","msg":"Invalid value","path":"email","location":"body"}]}
```

### T20. Missing Required Fields
```bash
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/register-device \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'
```
**Expected Error** (400):
```json
{"error":"Invalid input","details":[{"type":"field","msg":"Invalid value","path":"deviceUuid","location":"body"}]}
```

### T21. DeviceUuid Too Short
```bash
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/register-device \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","deviceUuid":"short"}'
```
**Expected Error** (400):
```json
{"error":"Invalid input","details":[{"type":"field","msg":"Invalid value","path":"deviceUuid","location":"body"}]}
```

---

## Phase 8: AIPS Client Persistence & Offline

### T22. License Persistence Across Restarts
1. Close AIPS application
2. Reopen AIPS
3. AIPS loads stored email from `/Users/Shared/AIPrivateSearch/config/app.json`
4. AIPS calls `validate-device` to confirm
**End State**: License persists, no re-activation needed, features still available

### T23. Offline Mode
1. Disconnect internet
2. Use AIPS for 5-10 minutes
3. **End State**: AIPS continues working with cached license status (5-minute cache)

4. Reconnect internet
5. **End State**: AIPS validates device on next check cycle

---

## Success Criteria Checklist

| # | Test | Status |
|---|------|--------|
| T1 | Server health check passes | ✅ |
| T2 | License service status shows active with DB connected | ✅ |
| T3 | Customer registration completes, verification email sent | ✅ |
| T4 | Email verification grants 60-day Standard trial | ✅ |
| T5 | Customer data accessible via check-limits API | ✅ |
| T6 | AIPS DMG downloads and installs | ✅ |
| T7 | First device registration succeeds | ✅ |
| T8 | Device validation confirms license is valid | ✅ |
| T9 | Re-registration updates existing device, no duplicate | ✅ |
| T10 | Standard features work, Premium features restricted | ✅ |
| T11 | Second device registration succeeds | ✅ |
| T12 | Check-limits shows correct device count and limit | ✅ |
| T13 | Admin login works | ✅ |
| T14 | Customer list shows correct tier and device count | ✅ |
| T15 | Tier upgrade to Premium works | ✅ |
| T16 | Device deletion works via admin | ⚠️ PARTIAL — Delete available on My Account page (customer self-service). Admin device delete on customer-edit page not yet implemented. Re-test when admin device management UI is built. |
| T17 | Password reset request always returns success | ✅ |
| T18 | Password reset with valid code works | ✅ |
| T19 | Invalid email format rejected | ✅ |
| T20 | Missing required fields rejected | ✅ |
| T21 | DeviceUuid too short rejected | ✅ |
| T22 | License persists across AIPS restarts | ✅ |
| T23 | Offline mode works with cached status | ✅ |

## Troubleshooting

### Debug Commands
```bash
# Check customer status and device slots
curl "https://custmgr.aiprivatesearch.com/api/licensing/check-limits?email=YOUR_EMAIL"

# Test device registration
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/register-device \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","deviceUuid":"debug-test-abcdef1234","deviceName":"Debug Mac","pcCode":"DBG001"}'

# Test device validation
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/validate-device \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","deviceUuid":"debug-test-abcdef1234"}'

# Server-side scripts (run on Ubuntu server)
node scripts/clear-rate-limits.mjs
node scripts/reset-customer-license.mjs YOUR_EMAIL
node scripts/delete-customer.mjs YOUR_EMAIL
node scripts/check-token.mjs <RESET_CODE>
```

### Common Issues
1. **Can't connect** → Check firewall, verify URL uses HTTPS, test with curl
2. **Registration fails** → Verify email is registered AND verified, check server logs
3. **Features not available after upgrade** → Restart AIPS to re-validate device with updated tier
4. **Device validation fails** → Check device is registered, license not expired, status is trial/active
5. **check-limits error** → Check server logs for SQL column mismatches
