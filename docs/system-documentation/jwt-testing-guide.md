# JWT Enhancement Testing Guide

## Changes Implemented

### 1. Enhanced JWT Payload
- ✅ Added standard claims: `iss`, `aud`, `jti`
- ✅ Added tier information: `tier`, `tier_name`, `status`
- ✅ Added device info: `device_id`, `current_devices`, `max_devices`
- ✅ Added features array based on tier
- ✅ Added token versioning: `token_version`, `token_type`

### 2. Device Tracking
- ✅ Created `devices` table in database
- ✅ Device registration on activation
- ✅ Device limit enforcement per tier
- ✅ Device status tracking (active/inactive/revoked)

### 3. Tier Checking
- ✅ `checkCustomerLimits()` method
- ✅ Returns tier info, device count, available slots
- ✅ Provides upgrade suggestions when limit reached

### 4. New Endpoints
- ✅ `GET /api/licensing/check-limits?email=user@example.com`

---

## Testing Steps

### Test 1: Check Limits for Non-Existent Customer

```bash
curl "http://localhost:56304/api/licensing/check-limits?email=newuser@test.com"
```

**Expected Response:**
```json
{
  "exists": false,
  "message": "Customer not found. Please register first."
}
```

### Test 2: Activate First Device

```bash
curl -X POST http://localhost:56304/api/licensing/activate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "hwId": "test-device-001",
    "appVersion": "19.61"
  }'
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJSUzI1NiIs...",
  "expires_in": 86400,
  "existing": false,
  "message": "License activated successfully"
}
```

### Test 3: Decode JWT Token

Use https://jwt.io or:

```bash
# Install jwt-cli: npm install -g jwt-cli
jwt decode <your-token>
```

**Expected Payload:**
```json
{
  "iss": "custmgr.aiprivatesearch.com",
  "sub": 1,
  "aud": "aiprivatesearch",
  "jti": "uuid-here",
  "iat": 1234567890,
  "exp": 1234654290,
  "email": "customer@example.com",
  "customer_id": 1,
  "tier": 1,
  "tier_name": "standard",
  "status": "active",
  "hw": "sha256-hash",
  "device_id": "uuid-here",
  "features": ["search", "collections"],
  "max_devices": 2,
  "current_devices": 1,
  "app": "aiprivatesearch",
  "ver": "19.61",
  "token_version": 2,
  "token_type": "access"
}
```

### Test 4: Check Limits for Existing Customer

```bash
curl "http://localhost:56304/api/licensing/check-limits?email=customer@example.com"
```

**Expected Response:**
```json
{
  "exists": true,
  "customerId": 1,
  "tier": 1,
  "tierName": "standard",
  "maxDevices": 2,
  "currentDevices": 1,
  "availableSlots": 1,
  "canActivate": true,
  "features": ["search", "collections"],
  "devices": [
    {
      "device_id": "uuid-here",
      "device_name": "Unknown Device",
      "hw_hash": "sha256-hash",
      "first_seen": "2024-01-15T10:30:00.000Z",
      "last_seen": "2024-01-15T10:30:00.000Z"
    }
  ],
  "message": "1 device slot(s) available."
}
```

### Test 5: Activate Second Device (Should Succeed)

```bash
curl -X POST http://localhost:56304/api/licensing/activate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "hwId": "test-device-002",
    "appVersion": "19.61"
  }'
```

**Expected:** Success (2/2 devices for standard tier)

### Test 6: Activate Third Device (Should Fail)

```bash
curl -X POST http://localhost:56304/api/licensing/activate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "hwId": "test-device-003",
    "appVersion": "19.61"
  }'
```

**Expected Response:**
```json
{
  "error": "Device limit reached. Maximum 2 devices allowed for standard tier. Current: 2/2"
}
```

### Test 7: Upgrade Customer Tier

```bash
# Connect to MySQL
mysql -u root -p

USE aiprivatesearch;
UPDATE customers SET subscription_tier = 2 WHERE email = 'customer@example.com';
```

### Test 8: Check Limits After Upgrade

```bash
curl "http://localhost:56304/api/licensing/check-limits?email=customer@example.com"
```

**Expected Response:**
```json
{
  "exists": true,
  "tier": 2,
  "tierName": "premium",
  "maxDevices": 5,
  "currentDevices": 2,
  "availableSlots": 3,
  "canActivate": true,
  "features": ["search", "multi-mode", "collections", "models"],
  "message": "3 device slot(s) available."
}
```

### Test 9: Activate Third Device (Should Now Succeed)

```bash
curl -X POST http://localhost:56304/api/licensing/activate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "hwId": "test-device-003",
    "appVersion": "19.61"
  }'
```

**Expected:** Success (3/5 devices for premium tier)

### Test 10: Validate Token

```bash
curl -X POST http://localhost:56304/api/licensing/validate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your-access-token-here"
  }'
```

**Expected Response:**
```json
{
  "valid": true,
  "payload": {
    "iss": "custmgr.aiprivatesearch.com",
    "sub": 1,
    "tier": 2,
    "tier_name": "premium",
    "features": ["search", "multi-mode", "collections", "models"],
    "max_devices": 5,
    "current_devices": 3
  },
  "message": "License is valid"
}
```

---

## Database Verification

### Check Customers Table

```sql
SELECT id, email, subscription_tier, created_at FROM customers;
```

### Check Devices Table

```sql
SELECT 
  d.device_id, 
  d.device_name, 
  d.status, 
  c.email,
  d.first_seen,
  d.last_seen
FROM devices d
JOIN customers c ON d.customer_id = c.id
ORDER BY d.last_seen DESC;
```

### Check Licenses Table

```sql
SELECT 
  l.id,
  c.email,
  l.hw_hash,
  l.expires_at,
  l.revoked,
  l.app_version
FROM licenses l
JOIN customers c ON l.customer_id = c.id
ORDER BY l.created_at DESC;
```

### Count Devices Per Customer

```sql
SELECT 
  c.email,
  c.subscription_tier,
  COUNT(d.id) as device_count
FROM customers c
LEFT JOIN devices d ON c.customer_id = d.customer_id AND d.status = 'active'
GROUP BY c.id;
```

---

## Tier Configuration Reference

| Tier | Name | Max Devices | Features |
|------|------|-------------|----------|
| 1 | standard | 2 | search, collections |
| 2 | premium | 5 | search, multi-mode, collections, models |
| 3 | professional | 10 | search, multi-mode, collections, models, config, doc-index |

---

## Token Expiration

- **Access Token:** 24 hours (86400 seconds)
- **Refresh Token:** 30 days (2592000 seconds)

---

## Troubleshooting

### Issue: "Database not initialized"

**Solution:**
```bash
# Restart the server to trigger database initialization
cd /Users/Shared/AIPrivateSearch/repo/aiprivatesearchcustmgr
./start.sh
```

### Issue: "Device limit reached" but database shows fewer devices

**Solution:**
```sql
-- Check for inactive/revoked devices
SELECT status, COUNT(*) FROM devices GROUP BY status;

-- Clean up test data
DELETE FROM devices WHERE customer_id = 1;
DELETE FROM licenses WHERE customer_id = 1;
DELETE FROM customers WHERE email = 'customer@example.com';
```

### Issue: Token validation fails

**Solution:**
- Check token hasn't expired (24 hours for access tokens)
- Verify token hasn't been revoked
- Use refresh token to get new access token

---

## Production Testing (Ubuntu Server)

After deploying to Ubuntu:

```bash
# SSH to server
ssh user@your-server

# Pull latest changes
cd /webs/AIPrivateSearch/repo/aiprivatesearchcustmgr
git pull

# Restart PM2
pm2 restart ecosystem.config.cjs

# Test endpoint
curl "https://custmgr.aiprivatesearch.com/api/licensing/status"

# Test check-limits
curl "https://custmgr.aiprivatesearch.com/api/licensing/check-limits?email=customer@example.com"
```

---

## Success Criteria

- ✅ JWT tokens include all enhanced fields
- ✅ Device tracking works correctly
- ✅ Device limits enforced per tier
- ✅ Check-limits endpoint returns accurate data
- ✅ Appropriate error messages when limits reached
- ✅ Refresh tokens work for token renewal
- ✅ Database tables created successfully
- ✅ No errors in PM2 logs
