# AIPS Remote License Server Testing Plan v1.37

Testing AI Private Search license activation using remote Ubuntu server (custmgr.aiprivatesearch.com) with AIPS client running on Mac.

## Test Environment

- **License Server**: Ubuntu server at custmgr.aiprivatesearch.com (ports 56303/56304)
- **AIPS Client**: Mac running aiprivatesearch.com application
- **Database**: Clean state (customers removed)
- **Network**: Internet connection required

## Phase 1: Server Verification

### T1. Server Health Check
```bash
# From Mac terminal
curl https://custmgr.aiprivatesearch.com/api/health
```
**Expected**: `{"status":"healthy","timestamp":"...","service":"aiprivatesearch-custmgr"}`

### T2. License Service Status
```bash
curl https://custmgr.aiprivatesearch.com/api/licensing/status
```
**Expected**: `{"service":"AIPrivateSearch Licensing","status":"active","database":{"connected":true,"customerCount":0}}`

## Phase 2: Customer Registration

### T3. New Customer Registration
1. **Open Registration Page**
   - Navigate to: https://custmgr.aiprivatesearch.com/customer-registration.html
   - Fill registration form:
     - Email: your-test-email@domain.com
     - Phone: 555-123-4567
     - City: Test City
     - State: CA
     - Postal Code: 12345
     - Password: TestPass123

2. **Email Verification**
   - Check email for 6-digit verification code
   - Enter code on verification page
   - **Expected**: License key displayed with download link

### T4. Verify Customer Creation
```bash
# Test API access to customer data
curl -X GET "https://custmgr.aiprivatesearch.com/api/licensing/check-limits?email=your-test-email@domain.com"
```
**Expected**: Customer exists with Standard tier, 0/2 devices used

## Phase 3: AIPS Client License Activation

### T5. Configure AIPS Client
1. **Download AIPS Client**
   - Download from: https://custmgr.aiprivatesearch.com/downloads/
   - Install on Mac

2. **Configure License Server**
   - Open AIPS application
   - Go to License/Settings
   - Set License Server URL: `https://custmgr.aiprivatesearch.com`
   - Set License Server Port: `56304`

### T6. First Device Activation
1. **Activate License**
   - In AIPS, go to License menu
   - Enter email: your-test-email@domain.com
   - Click "Activate License"
   - **Expected**: Success message, Standard tier features enabled

2. **Verify Activation**
   - Check AIPS shows: "Licensed to: your-test-email@domain.com"
   - Verify features available: Search, Collections
   - Verify tier: Standard (2 device limit)

### T7. Test AIPS Functionality
1. **Search Feature**
   - Perform a search query
   - **Expected**: Search works normally

2. **Collections Feature**
   - Create/access a collection
   - **Expected**: Collections work normally

3. **Restricted Features**
   - Try to access Multi-mode or Models (Premium features)
   - **Expected**: Features disabled/restricted for Standard tier

## Phase 4: Device Limit Testing

### T8. Second Device Simulation
```bash
# Simulate second device activation via API
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/activate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-test-email@domain.com",
    "hwId": "TEST-MAC-DEVICE-002",
    "appVersion": "19.83",
    "appId": "aiprivatesearch"
  }'
```
**Expected**: Success, devicesUsed: 2/2

### T9. Device Limit Enforcement
```bash
# Try to activate third device (should fail)
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/activate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-test-email@domain.com",
    "hwId": "TEST-MAC-DEVICE-003",
    "appVersion": "19.83",
    "appId": "aiprivatesearch"
  }'
```
**Expected**: Error "Device limit reached. Maximum 2 devices allowed for standard tier"

## Phase 5: Admin Interface Testing

### T10. Admin Login
1. **Access Admin Interface**
   - Navigate to: https://custmgr.aiprivatesearch.com/user-management.html
   - Login: adm-custmgr@a.com / 123

2. **Customer Management**
   - Go to Customer Management
   - Find your test customer
   - **Expected**: Shows Standard tier, 2/2 devices used

### T11. Tier Upgrade
1. **Upgrade Customer**
   - Click Edit on your customer
   - Change tier from Standard (1) to Premium (2)
   - Save changes

2. **Verify Upgrade**
   - Check customer shows Premium tier
   - Device limit should show 2/5 devices used

### T12. Test Increased Limits
```bash
# Third device should now activate (Premium allows 5)
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/activate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-test-email@domain.com",
    "hwId": "TEST-MAC-DEVICE-003",
    "appVersion": "19.83",
    "appId": "aiprivatesearch"
  }'
```
**Expected**: Success, devicesUsed: 3/5

## Phase 6: AIPS Client Advanced Testing

### T13. License Refresh in AIPS
1. **Restart AIPS Application**
   - Close and reopen AIPS
   - **Expected**: License persists, no re-activation needed

2. **Check Updated Features**
   - Verify Premium features now available: Multi-mode, Models
   - Test Premium features work correctly

### T14. Offline Mode Testing
1. **Disconnect Internet**
   - Disable network connection on Mac
   - Use AIPS for 5-10 minutes
   - **Expected**: AIPS continues working in offline mode

2. **Reconnect and Sync**
   - Re-enable network connection
   - **Expected**: AIPS syncs with license server

### T15. Token Validation
```bash
# Test token validation (extract token from AIPS logs if needed)
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/validate \
  -H "Content-Type: application/json" \
  -d '{"token":"ACTUAL_TOKEN_FROM_AIPS"}'
```
**Expected**: Valid token with Premium tier info

## Phase 7: Error Handling & Edge Cases

### T16. Invalid Email Test
1. **Try Invalid Email in AIPS**
   - Enter non-existent email in license activation
   - **Expected**: Clear error message "Customer not found"

### T17. Network Interruption
1. **Activate During Network Issues**
   - Temporarily block network during activation
   - **Expected**: Appropriate timeout/retry behavior

### T18. Rate Limiting
```bash
# Make rapid activation attempts
for i in {1..10}; do
  curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/activate \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"your-test-email@domain.com\",\"hwId\":\"SPAM-$i\",\"appVersion\":\"19.83\"}"
  sleep 0.1
done
```
**Expected**: Rate limiting kicks in after 5 attempts

## Success Criteria Checklist

- [ ] T1: Server health check passes
- [ ] T2: License service status shows active
- [ ] T3: Customer registration completes successfully
- [ ] T4: Customer data accessible via API
- [ ] T5: AIPS client downloads and installs
- [ ] T6: First device activation succeeds in AIPS
- [ ] T7: AIPS functionality works with Standard tier
- [ ] T8: Second device activation succeeds
- [ ] T9: Device limit properly enforced
- [ ] T10: Admin interface accessible and functional
- [ ] T11: Tier upgrade works through admin interface
- [ ] T12: Increased device limits work after upgrade
- [ ] T13: AIPS license persists across restarts
- [ ] T14: Offline mode works correctly
- [ ] T15: Token validation works
- [ ] T16: Error handling works for invalid emails
- [ ] T17: Network interruption handled gracefully
- [ ] T18: Rate limiting prevents abuse

## Troubleshooting

### Common Issues
1. **AIPS Can't Connect to License Server**
   - Check firewall settings
   - Verify URL: https://custmgr.aiprivatesearch.com:56304
   - Test with curl from Mac terminal

2. **License Activation Fails**
   - Verify email is registered and verified
   - Check device limit not exceeded
   - Clear rate limits if needed (contact admin)

3. **Features Not Available**
   - Verify correct tier in admin interface
   - Restart AIPS after tier upgrade
   - Check token expiration

### Debug Commands
```bash
# Check customer status
curl "https://custmgr.aiprivatesearch.com/api/licensing/check-limits?email=YOUR_EMAIL"

# Test direct activation
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/activate \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","hwId":"DEBUG-TEST","appVersion":"19.83"}'
```

## Notes
- Use your actual email address for testing
- Keep track of device activations (Standard: 2, Premium: 5, Professional: 10)
- Test with latest AIPS version
- Document any issues with exact error messages
- Take screenshots of successful activations