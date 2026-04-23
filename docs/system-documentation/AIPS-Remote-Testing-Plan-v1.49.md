# AIPS Remote License Server Testing Plan v1.49

Testing AI Private Search license activation using remote Ubuntu server (custmgr.aiprivatesearch.com) with AIPS client running on Mac.

## Test Environment

- **License Server**: Ubuntu server at custmgr.aiprivatesearch.com (ports 56303/56304)
- **AIPS Client**: Mac running aiprivatesearch.com application
- **Database**: MySQL on remote server
- **Network**: Internet connection required
- **Download**: DMG installer at https://aiprivatesearch.com/downloads/AIPrivateSearch.dmg

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

## Phase 3: AIPS Client License Activation

### T6. Download & Install AIPS
- Download from: `https://aiprivatesearch.com/downloads/AIPrivateSearch.dmg`
- Install on Mac
- Configure license server URL to `https://custmgr.aiprivatesearch.com`

### T7. First Device Activation
1. In AIPS, enter registered email
2. Click Activate

**Expected Response** (200):
```json
{"success":true,"token":"<jwt>","refreshToken":"<jwt>","tier":1,"features":["search","collections"],"deviceLimit":2,"devicesUsed":1,"existing":false,"message":"License activated successfully"}
```
**End State**: AIPS shows Standard tier, search and collections enabled, 1/2 devices used

**Error — unregistered email** (400):
```json
{"success":false,"error":"Customer not found or email not verified. Please register first."}
```

**Error — expired license** (400):
```json
{"success":false,"error":"License expired. Please renew your subscription."}
```

**Error — cancelled/expired status** (400):
```json
{"success":false,"error":"License cancelled. Please renew your subscription."}
```

**Error — invalid input** (400):
```json
{"error":"Invalid input","details":[...]}
```

### T8. Re-activation (Same Device)
Activate again with same email and hardware ID.

**Expected Response** (200):
```json
{"success":true,"token":"<jwt>","refreshToken":"<jwt>","tier":1,"features":["search","collections"],"deviceLimit":2,"devicesUsed":1,"existing":true,"message":"License already exists"}
```
**End State**: New token issued, device count unchanged (still 1/2)

### T9. Test AIPS Functionality
1. **Search** → Expected: works
2. **Collections** → Expected: works
3. **Multi-mode / Models** (Premium features) → Expected: restricted for Standard tier

---

## Phase 4: Device Limit Testing

### T10. Second Device Activation
```bash
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/activate \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@domain.com","hwId":"TEST-DEVICE-002-ABCDEFGHIJ","appVersion":"19.83"}'
```
**Expected Response** (200):
```json
{"success":true,"token":"<jwt>","refreshToken":"<jwt>","tier":1,"features":["search","collections"],"deviceLimit":2,"devicesUsed":2,"existing":false,"message":"License activated successfully"}
```
**End State**: 2/2 devices used, no more slots available

### T11. Device Limit Enforcement (Third Device)
```bash
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/activate \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@domain.com","hwId":"TEST-DEVICE-003-ABCDEFGHIJ","appVersion":"19.83"}'
```
**Expected Error** (400):
```json
{"success":false,"error":"Device limit reached. Maximum 2 devices allowed for standard tier. Current: 2/2"}
```
**End State**: No new device registered, still 2/2

---

## Phase 5: Admin Interface Testing

### T12. Admin Login
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

### T13. View Customer with Licenses
1. Go to Customer Management
2. Find test customer

**Expected**: Shows Standard tier, trial status, 2/2 devices, expiration date ~60 days out

### T14. Tier Upgrade (Standard → Premium)
1. Edit test customer
2. Change tier to Premium (2)
3. Save

**End State**: Customer shows Premium tier, device limit now 5, devices show 2/5

### T15. Activate Third Device After Upgrade
```bash
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/activate \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@domain.com","hwId":"TEST-DEVICE-003-ABCDEFGHIJ","appVersion":"19.83"}'
```
**Expected Response** (200):
```json
{"success":true,"token":"<jwt>","refreshToken":"<jwt>","tier":2,"features":["search","multi-mode","collections","models"],"deviceLimit":5,"devicesUsed":3,"existing":false,"message":"License activated successfully"}
```
**End State**: 3/5 devices, Premium features in token

---

## Phase 6: Token Operations

### T16. Token Validation
```bash
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/validate \
  -H "Content-Type: application/json" \
  -d '{"token":"<JWT_FROM_ACTIVATION>"}'
```
**Expected Response** (200):
```json
{"valid":true,"email":"...","tier":2,"features":["search","multi-mode","collections","models"],"deviceLimit":5,"expiresAt":"...","message":"License is valid"}
```

**Error — revoked token** (401):
```json
{"valid":false,"reason":"Token revoked"}
```

**Error — expired token** (401):
```json
{"valid":false,"reason":"Invalid token: jwt expired"}
```

**Error — customer/device removed** (401):
```json
{"valid":false,"reason":"Customer or device not found"}
```

### T17. Token Refresh
```bash
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<REFRESH_TOKEN_FROM_ACTIVATION>"}'
```
**Expected Response** (200):
```json
{"success":true,"token":"<new-jwt>","message":"Token refreshed successfully"}
```

**Error — revoked** (401):
```json
{"success":false,"error":"Token refresh failed: Token has been revoked"}
```

**Error — invalid** (401):
```json
{"success":false,"error":"Token refresh failed: Invalid token: ..."}
```

### T18. Token Revocation
```bash
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/revoke \
  -H "Content-Type: application/json" \
  -d '{"token":"<JWT_TO_REVOKE>","reason":"Testing revocation"}'
```
**Expected Response** (200):
```json
{"success":true,"message":"License revoked successfully"}
```
**End State**: Token added to revocation list, associated device status set to "revoked"

---

## Phase 7: Device Registration (Non-JWT Flow)

### T19. Register Device Without JWT
```bash
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/register-device \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@domain.com","deviceUuid":"uuid-test-device-04","deviceName":"Test Mac","pcCode":"PC001","ipAddress":"1.2.3.4"}'
```
**Expected Response** (200):
```json
{"success":true,"customer":{"email":"...","tier":2,"license_status":"trial"},"device":{"uuid":"uuid-test-device-04","name":"Test Mac","status":"active"}}
```

**Error — unverified email** (400):
```json
{"success":false,"error":"Customer not found or email not verified"}
```

### T20. Validate Device Without JWT
```bash
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/validate-device \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@domain.com","deviceUuid":"uuid-test-device-04"}'
```
**Expected Response** (200):
```json
{"valid":true,"customer":{"email":"...","tier":2,"license_status":"trial","expires_at":"..."},"device":{"uuid":"uuid-test-device-04","name":"Test Mac","registered_at":"..."}}
```

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

---

## Phase 8: Password Reset Flow

### T21. Request Password Reset
```bash
curl -X POST https://custmgr.aiprivatesearch.com/api/customers/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@domain.com"}'
```
**Expected Response** (200 — always, to prevent email enumeration):
```json
{"success":true,"message":"If the email exists, a reset code has been sent."}
```

### T22. Reset Password with Code
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

## Phase 9: Error Handling & Rate Limiting

### T23. Rate Limiting — Activation Endpoint
```bash
for i in {1..10}; do
  curl -s -X POST https://custmgr.aiprivatesearch.com/api/licensing/activate \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"your-test-email@domain.com\",\"hwId\":\"SPAM-TEST-$i-ABCDEF\",\"appVersion\":\"19.83\"}"
  echo ""
done
```
**Expected**: First 5 requests process normally, then:

**Express rate limiter** (429):
```json
{"error":"Too many activation attempts. Please wait 5 minutes before trying again, or contact support to reset your rate limit."}
```

**Application-level rate limiter** (400):
```json
{"success":false,"error":"Too many activation attempts. Please wait 5 minutes before trying again, or contact support to reset your rate limit."}
```

Note: Two layers of rate limiting — express-rate-limit (5 per 5 min per IP) and application-level (5 per 5 min per email/device/IP combo).

### T24. Invalid Input Validation
```bash
# Missing hwId
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/activate \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'
```
**Expected Error** (400):
```json
{"error":"Invalid input","details":[{"type":"field","msg":"Invalid value","path":"hwId","location":"body"}]}
```

### T25. Invalid Email Format
```bash
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/activate \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email","hwId":"TEST-DEVICE-ABCDEFGHIJ"}'
```
**Expected Error** (400):
```json
{"error":"Invalid input","details":[{"type":"field","msg":"Invalid value","path":"email","location":"body"}]}
```

---

## Phase 10: AIPS Client Persistence & Offline

### T26. License Persistence Across Restarts
1. Close AIPS application
2. Reopen AIPS
3. **End State**: License persists, no re-activation needed, features still available

### T27. Offline Mode
1. Disconnect internet
2. Use AIPS for 5-10 minutes
3. **End State**: AIPS continues working with cached token (24-hour access token validity)

4. Reconnect internet
5. **End State**: AIPS syncs with license server on next validation

---

## Success Criteria Checklist

| # | Test | Status |
|---|------|--------|
| T1 | Server health check passes | ✅ |
| T2 | License service status shows active with DB connected | ✅ |
| T3 | Customer registration completes, verification email sent | ✅ |
| T4 | Email verification grants 60-day Standard trial | ✅ |
| T5 | Customer data accessible via check-limits API | ☐ |
| T6 | AIPS DMG downloads and installs | ☐ |
| T7 | First device activation succeeds, Standard features enabled | ☐ |
| T8 | Re-activation returns existing=true, no duplicate device | ☐ |
| T9 | Standard features work, Premium features restricted | ☐ |
| T10 | Second device activation succeeds (2/2) | ☐ |
| T11 | Third device blocked with device limit error | ☐ |
| T12 | Admin login works | ☐ |
| T13 | Customer list shows correct tier and device count | ☐ |
| T14 | Tier upgrade to Premium works | ☐ |
| T15 | Third device activates after upgrade (3/5) | ☐ |
| T16 | Token validation returns correct tier and features | ☐ |
| T17 | Token refresh returns new valid token | ☐ |
| T18 | Token revocation works, device marked revoked | ☐ |
| T19 | Device registration without JWT works | ☐ |
| T20 | Device validation without JWT works | ☐ |
| T21 | Password reset request always returns success | ☐ |
| T22 | Password reset with valid code works | ☐ |
| T23 | Rate limiting blocks after 5 rapid attempts | ☐ |
| T24 | Invalid input returns validation errors | ☐ |
| T25 | Invalid email format rejected | ☐ |
| T26 | License persists across AIPS restarts | ☐ |
| T27 | Offline mode works with cached token | ☐ |

## Troubleshooting

### Debug Commands
```bash
# Check customer status and device slots
curl "https://custmgr.aiprivatesearch.com/api/licensing/check-limits?email=YOUR_EMAIL"

# Test activation
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/activate \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","hwId":"DEBUG-TEST-ABCDEFGHIJ","appVersion":"19.83"}'

# Clear rate limits (run on server)
node scripts/clear-rate-limits.mjs

# Reset customer license (run on server)
node scripts/reset-customer-license.mjs YOUR_EMAIL

# Delete test customer (run on server)
node scripts/delete-customer.mjs YOUR_EMAIL

# Inspect a token (run on server)
node scripts/check-token.mjs <JWT_TOKEN>
```

### Common Issues
1. **Can't connect** → Check firewall, verify URL uses HTTPS, test with curl
2. **Activation fails** → Verify email is registered AND verified, check device limit, check rate limits
3. **Features not available after upgrade** → Restart AIPS to get new token with updated tier
4. **Rate limited** → Wait 5 minutes or run clear-rate-limits.mjs on server
5. **Token expired** → Use refresh token endpoint or re-activate
