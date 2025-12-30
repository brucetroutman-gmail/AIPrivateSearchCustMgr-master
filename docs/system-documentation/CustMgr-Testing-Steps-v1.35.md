# CustMgr License Testing Steps v1.35

Based on AIPS-custmgr-license-fix.md, here are the testing steps for the license activation system:

## Pre-Testing Setup

1. **Environment Verification**
   ```bash
   # Verify CustMgr server is running
   curl http://localhost:56304/api/health
   
   # Check database connection
   mysql -u aips-readwrite -p aiprivatesearch -e "SELECT COUNT(*) FROM customers;"
   ```

2. **Clean Database State**
   ```bash
   # Run the data cleanup script (already done in v1.35)
   cd /Users/Shared/AIPrivateSearch/repo/aiprivatesearchcustmgr/server/s01_server-first-app
   node scripts/clear-customer-data.mjs
   ```

## Phase 1: Database Schema Verification

### T18. Database Schema Completeness
```sql
-- Verify customers table has integrated license fields
DESCRIBE customers;
-- Should include: tier, license_status, trial_started_at, expires_at, grace_period_ends

-- Verify devices table structure
DESCRIBE devices;
-- Should include: customer_id, device_id, hw_hash, status

-- Verify supporting tables
DESCRIBE activation_attempts;
DESCRIBE revocation_list;
DESCRIBE payments;
```

### T19. Data Integrity Check
```sql
-- Verify clean state after data cleanup
SELECT COUNT(*) as customer_count FROM customers;
SELECT COUNT(*) as device_count FROM devices;
SELECT COUNT(*) as attempt_count FROM activation_attempts;
-- All should return 0
```

## Phase 2: Customer Registration Flow

### T20. New Customer Registration
1. **Register via CustMgr UI**
   - Go to http://localhost:56303/customer-registration.html
   - Fill form: email, phone, city, state, postal code, password
   - Submit registration

2. **Verify Database Entry**
   ```sql
   SELECT id, email, tier, license_status, customer_code, email_verified 
   FROM customers WHERE email = 'bruce.troutman@gmail.com';
   ```

3. **Email Verification**
   - Check email for 6-digit code
   - Enter code on verification page
   - Verify license key and download link displayed

4. **Verify License Creation**
   ```sql
   SELECT email, tier, license_status, trial_started_at, expires_at 
   FROM customers WHERE email = 'bruce.troutman@gmail.com';
   -- Should show: tier=1, license_status='trial', 60-day expiration
   ```

## Phase 3: License Activation Testing

### T21. First Device Activation
```bash
# Test license activation via API
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/activate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bruce.troutman@gmail.com",
    "hwId": "MAC-DEVICE-001",
    "appVersion": "19.83",
    "appId": "aiprivatesearch"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJ...",
  "refreshToken": "eyJ...",
  "tier": 1,
  "features": ["search", "collections"],
  "deviceLimit": 2,
  "devicesUsed": 1
}
```

### T22. Device Count Verification
```sql
-- Verify device was registered
SELECT customer_id, device_id, hw_hash, status, first_seen 
FROM devices d
JOIN customers c ON c.id = d.customer_id 
WHERE c.email = 'bruce.troutman@gmail.com';
```

### T23. Second Device Activation (Standard Tier)
```bash
# Activate second device for Standard tier (limit: 2)
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/activate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bruce.troutman@gmail.com",
    "hwId": "MAC-DEVICE-002",
    "appVersion": "19.83",
    "appId": "aiprivatesearch"
  }'
```

**Expected:** Success with devicesUsed: 2

### T24. Device Limit Enforcement
```bash
# Try to activate third device (should fail for Standard tier)
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/activate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bruce.troutman@gmail.com",
    "hwId": "MAC-DEVICE-003",
    "appVersion": "19.83",
    "appId": "aiprivatesearch"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Device limit reached",
  "tier": 1,
  "deviceLimit": 2,
  "devicesUsed": 2
}
```

## Phase 4: Admin Interface Testing

### T25. Customer Management Interface
1. **Login as Admin**
   - Go to https://custmgr.aiprivatesearch.com/user-management.html
   - Login: adm-custmgr@a.com / 123

2. **View Customer List**
   - Go to Customer Management
   - Verify test customer appears with correct license info
   - Check device count shows 2/2

3. **Edit Customer**
   - Click Edit on test customer
   - Verify Device Management section shows:
     - Tier: Standard (2/2 devices used)
     - Available Slots: 0
     - Device list with MAC-DEVICE-001 and MAC-DEVICE-002

### T26. Tier Upgrade Testing
1. **Upgrade Customer to Premium**
   - In customer-edit page, change tier to Premium (2)
   - Save customer info
   - Verify database update:
   ```sql
   SELECT email, tier FROM customers WHERE email = 'bruce.troutman@gmail.com';
   -- Should show tier = 2
   ```

2. **Test Increased Device Limit**
   ```bash
   # Now third device should activate (Premium allows 5 devices)
   curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/activate \
     -H "Content-Type: application/json" \
     -d '{
       "email": "bruce.troutman@gmail.com",
       "hwId": "MAC-DEVICE-003",
       "appVersion": "19.83",
       "appId": "aiprivatesearch"
     }'
   ```
   **Expected:** Success with devicesUsed: 3, deviceLimit: 5

## Phase 5: Rate Limiting Testing

### T27. Rate Limit Verification
```bash
# Make multiple rapid activation attempts
for i in {1..10}; do
  curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/activate \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"bruce.troutman@gmail.com\",\"hwId\":\"SPAM-$i\",\"appVersion\":\"19.83\",\"appId\":\"aiprivatesearch\"}"
  sleep 0.1
done
```

**Expected:** Should get rate limited after reasonable number of attempts

### T28. Rate Limit Recovery
```bash
# Wait for rate limit timeout, then try valid request
sleep 60
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/activate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bruce.troutman@gmail.com",
    "hwId": "MAC-DEVICE-004",
    "appVersion": "19.83",
    "appId": "aiprivatesearch"
  }'
```

**Expected:** Should succeed after timeout period

## Phase 6: Token Validation Testing

### T29. JWT Token Validation
```bash
# Extract token from activation response and validate
TOKEN="eyJ..." # From activation response
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/validate \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\"}"
```

**Expected Response:**
```json
{
  "valid": true,
  "email": "bruce.troutman@gmail.com",
  "tier": 2,
  "features": ["search", "multi-mode", "collections", "models"],
  "deviceLimit": 5,
  "expiresAt": "2025-02-09T..."
}
```

### T30. Token Refresh Testing
```bash
# Test refresh token functionality
REFRESH_TOKEN="eyJ..." # From activation response
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
```

## Phase 7: Integration Testing

### T31. End-to-End AIPS Client Test
1. **Setup AIPS Client**
   - Install AIPS on test machine
   - Configure to use custmgr.aiprivatesearch.com as license server

2. **Test License Activation**
   - Enter bruce.troutman@gmail.com in AIPS license dialog
   - Verify successful activation
   - Check AIPS shows correct tier and features

3. **Test License Persistence**
   - Restart AIPS
   - Verify license persists without re-activation
   - Test offline mode functionality

## Success Criteria Checklist

- [ ] T18: Database schema complete and correct
- [ ] T19: Clean database state verified
- [ ] T20: Customer registration flow works end-to-end
- [ ] T21: First device activation succeeds
- [ ] T22: Device count accurate in database
- [ ] T23: Second device activation succeeds
- [ ] T24: Device limit properly enforced
- [ ] T25: Admin interface shows correct device info
- [ ] T26: Tier upgrades work and increase device limits
- [ ] T27: Rate limiting prevents abuse
- [ ] T28: Rate limits reset after timeout
- [ ] T29: JWT tokens validate correctly
- [ ] T30: Token refresh works
- [ ] T31: AIPS client integration works

## Troubleshooting Commands

```bash
# Check server logs
tail -f /Users/Shared/AIPrivateSearch/repo/aiprivatesearchcustmgr/server/s01_server-first-app/logs/server.log

# Check database state
mysql -u aips-readwrite -p aiprivatesearch -e "
SELECT c.email, c.tier, c.license_status, COUNT(d.id) as device_count
FROM customers c 
LEFT JOIN devices d ON c.id = d.customer_id AND d.status = 'active'
GROUP BY c.id;
"

# Clear rate limits if needed
mysql -u aips-readwrite -p aiprivatesearch -e "DELETE FROM activation_attempts WHERE last_attempt < NOW() - INTERVAL 1 HOUR;"
```

## Notes
- Run tests in order as they build on each other
- Document any failures with exact error messages
- Take database snapshots before major test phases
- Test both localhost and production environments