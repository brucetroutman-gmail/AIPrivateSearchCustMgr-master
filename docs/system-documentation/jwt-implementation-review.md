# JWT Token Plan Review & Implementation Adjustments

**Review Date:** 2024  
**Current Version:** 1.21  
**Status:** Partial Implementation

---

## Current Implementation vs Plan

### ✅ Already Implemented

1. **JWT Token Generation (RS256)**
   - ✅ RSA key pair generation
   - ✅ Private/public key storage in `/keys` directory
   - ✅ Token signing with RS256 algorithm
   - ✅ 30-day token expiration

2. **Token Payload Structure**
   - ✅ Customer ID (`sub`)
   - ✅ Email
   - ✅ Hardware hash (`hw`)
   - ✅ Subscription tier (`tier`)
   - ✅ App version (`ver`)
   - ✅ Standard JWT claims (iat, exp)

3. **Token Operations**
   - ✅ Token creation
   - ✅ Token verification
   - ✅ Token refresh
   - ✅ Token hashing for revocation
   - ✅ Public key retrieval

4. **Security Features**
   - ✅ Hardware binding (SHA-256 hash)
   - ✅ Rate limiting (5 attempts/15min)
   - ✅ Revocation list in database
   - ✅ Activation attempt tracking

### ⚠️ Partially Implemented

1. **Token Payload** - Missing from plan:
   - ❌ `iss` (issuer)
   - ❌ `aud` (audience)
   - ❌ `jti` (JWT ID)
   - ❌ `customer_id` (separate from sub)
   - ❌ `subscription_id`
   - ❌ `status` (active/trial/expired)
   - ❌ `current_period_end`
   - ❌ `device_id` and `device_name`
   - ❌ `features` array
   - ❌ `max_devices` and `current_devices`
   - ❌ `token_version`

2. **Token Lifecycle**
   - ✅ Manual refresh endpoint exists
   - ❌ Automatic refresh (1 hour before expiration)
   - ❌ Shorter 24-hour tokens with refresh mechanism
   - ❌ Separate refresh tokens

3. **API Endpoints**
   - ✅ `/api/licensing/activate`
   - ✅ `/api/licensing/refresh`
   - ✅ `/api/licensing/validate`
   - ✅ `/api/licensing/revoke`
   - ✅ `/api/licensing/public-key`
   - ❌ `/api/auth/token` (separate from activation)
   - ❌ `/api/auth/device` (device registration)

### ❌ Not Implemented

1. **Storage Strategy**
   - ❌ app_token integration
   - ❌ localStorage migration
   - ❌ Unified storage API

2. **Advanced Security**
   - ❌ Anomaly detection
   - ❌ Audit logging
   - ❌ Emergency revocation system

3. **Client-Side Integration**
   - ❌ UnifiedLicenseManager class
   - ❌ Backward compatibility layer
   - ❌ Migration functions

---

## Recommended Adjustments

### Priority 1: Enhance JWT Payload (Immediate)

**Current Payload:**
```javascript
{
  sub: customerId,
  email: email,
  hw: hwHash,
  app: 'aiprivatesearch',
  tier: 1,
  ver: '19.61',
  iat: timestamp,
  exp: timestamp
}
```

**Enhanced Payload:**
```javascript
{
  // Standard JWT claims
  iss: 'custmgr.aiprivatesearch.com',
  sub: customerId,
  aud: 'aiprivatesearch',
  jti: crypto.randomUUID(),
  iat: timestamp,
  exp: timestamp,
  
  // Customer info
  email: email,
  customer_id: customerId,
  
  // Subscription
  tier: 2,
  tier_name: 'premium',
  status: 'active',
  
  // Device binding
  hw: hwHash,
  device_id: deviceId,
  
  // Features & limits
  features: ['search', 'multi-mode', 'collections'],
  max_devices: 5,
  current_devices: 2,
  
  // Metadata
  app: 'aiprivatesearch',
  ver: '19.61',
  token_version: 2
}
```

**Implementation:**
```javascript
// Update jwt-manager.mjs
export function createLicenseToken(payload) {
  const tokenPayload = {
    // Standard claims
    iss: 'custmgr.aiprivatesearch.com',
    sub: payload.customerId,
    aud: 'aiprivatesearch',
    jti: crypto.randomUUID(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 3600),
    
    // Customer
    email: payload.email,
    customer_id: payload.customerId,
    
    // Subscription
    tier: payload.subscriptionTier || 1,
    tier_name: getTierName(payload.subscriptionTier || 1),
    status: payload.status || 'active',
    
    // Device
    hw: payload.hwHash,
    device_id: payload.deviceId || crypto.randomUUID(),
    
    // Features
    features: getTierFeatures(payload.subscriptionTier || 1),
    max_devices: getMaxDevices(payload.subscriptionTier || 1),
    current_devices: payload.currentDevices || 1,
    
    // Metadata
    app: 'aiprivatesearch',
    ver: payload.appVersion || '19.61',
    token_version: 2
  };

  return jwt.sign(tokenPayload, privateKey, { algorithm: 'RS256' });
}

function getTierName(tier) {
  const names = { 1: 'standard', 2: 'premium', 3: 'professional' };
  return names[tier] || 'standard';
}

function getTierFeatures(tier) {
  const features = {
    1: ['search', 'collections'],
    2: ['search', 'multi-mode', 'collections', 'models'],
    3: ['search', 'multi-mode', 'collections', 'models', 'config', 'doc-index']
  };
  return features[tier] || features[1];
}

function getMaxDevices(tier) {
  const limits = { 1: 2, 2: 5, 3: 10 };
  return limits[tier] || 2;
}
```

### Priority 2: Add Device Tracking (High)

**Database Schema Addition:**
```sql
CREATE TABLE IF NOT EXISTS devices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  device_id VARCHAR(255) UNIQUE NOT NULL,
  hw_hash VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  device_info JSON,
  first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  status ENUM('active', 'inactive', 'revoked') DEFAULT 'active',
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  INDEX idx_customer_devices (customer_id, status)
);
```

**Update licensing-service.mjs:**
```javascript
static async activateLicense(email, hwId, appVersion, ipAddress, deviceInfo = {}) {
  const db = getDB();
  const hwHash = crypto.createHash('sha256').update(hwId).digest('hex');
  const deviceId = crypto.randomUUID();

  // Check device limit
  const customerId = await this.getOrCreateCustomer(email);
  const [customer] = await db.execute(
    'SELECT subscription_tier FROM customers WHERE id = ?',
    [customerId]
  );
  
  const tier = customer[0].subscription_tier;
  const maxDevices = getMaxDevices(tier);
  
  // Count active devices
  const [devices] = await db.execute(
    'SELECT COUNT(*) as count FROM devices WHERE customer_id = ? AND status = "active"',
    [customerId]
  );
  
  if (devices[0].count >= maxDevices) {
    throw new Error(`Device limit reached. Maximum ${maxDevices} devices allowed for ${getTierName(tier)} tier.`);
  }
  
  // Register device
  await db.execute(
    'INSERT INTO devices (customer_id, device_id, hw_hash, device_name, device_info) VALUES (?, ?, ?, ?, ?)',
    [customerId, deviceId, hwHash, deviceInfo.name || 'Unknown Device', JSON.stringify(deviceInfo)]
  );
  
  // Generate token with device info
  const token = createLicenseToken({
    customerId,
    email,
    hwHash,
    deviceId,
    subscriptionTier: tier,
    currentDevices: devices[0].count + 1,
    appVersion
  });
  
  // ... rest of activation logic
}
```

### Priority 3: Implement Tier Checking (High - Task #011)

**Update licensing-service.mjs:**
```javascript
static async checkCustomerLimits(email) {
  const db = getDB();
  
  // Get customer
  const [customers] = await db.execute(
    'SELECT id, subscription_tier, status FROM customers WHERE email = ?',
    [email]
  );
  
  if (customers.length === 0) {
    return {
      exists: false,
      message: 'Customer not found. Please register first.'
    };
  }
  
  const customer = customers[0];
  const tier = customer.subscription_tier;
  const tierName = getTierName(tier);
  const maxDevices = getMaxDevices(tier);
  
  // Count active devices
  const [devices] = await db.execute(
    'SELECT COUNT(*) as count FROM devices WHERE customer_id = ? AND status = "active"',
    [customer.id]
  );
  
  const currentDevices = devices[0].count;
  
  return {
    exists: true,
    customerId: customer.id,
    tier,
    tierName,
    status: customer.status,
    maxDevices,
    currentDevices,
    canActivate: currentDevices < maxDevices,
    message: currentDevices >= maxDevices 
      ? `Device limit reached (${currentDevices}/${maxDevices}). Upgrade to ${tier < 3 ? getTierName(tier + 1) : 'higher'} tier for more devices.`
      : `${maxDevices - currentDevices} device slots available.`
  };
}
```

**Add new endpoint in routes/licensing.mjs:**
```javascript
// GET /check-limits - Check customer limits before activation
router.get('/check-limits', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    const result = await LicensingService.checkCustomerLimits(email);
    res.json(result);
    
  } catch (error) {
    console.error('Check limits error:', error);
    res.status(500).json({ error: 'Failed to check limits' });
  }
});
```

### Priority 4: Shorter Token Expiration with Refresh (Medium)

**Update jwt-manager.mjs:**
```javascript
export function createLicenseToken(payload, isRefreshToken = false) {
  const expiration = isRefreshToken 
    ? 30 * 24 * 3600  // 30 days for refresh tokens
    : 24 * 3600;       // 24 hours for access tokens
  
  const tokenPayload = {
    // ... existing payload
    exp: Math.floor(Date.now() / 1000) + expiration,
    token_type: isRefreshToken ? 'refresh' : 'access'
  };

  return jwt.sign(tokenPayload, privateKey, { algorithm: 'RS256' });
}

export function createRefreshToken(payload) {
  return createLicenseToken(payload, true);
}
```

**Update activation to return both tokens:**
```javascript
// In licensing-service.mjs
const accessToken = createLicenseToken({ /* ... */ });
const refreshToken = createRefreshToken({ /* ... */ });

return { 
  token: accessToken,
  refresh_token: refreshToken,
  expires_in: 86400, // 24 hours
  existing: false 
};
```

---

## Implementation Plan

### Phase 1: Immediate (This Sprint)

1. ✅ **Enhance JWT payload** with all planned fields
2. ✅ **Add device tracking** database table and logic
3. ✅ **Implement tier checking** (Task #011)
4. ✅ **Add check-limits endpoint**

### Phase 2: Short-term (Next Sprint)

5. ⏳ **Implement refresh tokens** (24-hour access + 30-day refresh)
6. ⏳ **Add device management** endpoints (list, revoke)
7. ⏳ **Enhance error messages** with tier-specific guidance
8. ⏳ **Add audit logging** for all token operations

### Phase 3: Medium-term (Future)

9. ⏳ **Client-side integration** (UnifiedLicenseManager)
10. ⏳ **localStorage migration** utilities
11. ⏳ **Automatic token refresh** logic
12. ⏳ **Admin dashboard** for device/license management

---

## Files to Modify

### Immediate Changes

1. **server/s01_server-first-app/lib/jwt-manager.mjs**
   - Enhance createLicenseToken payload
   - Add helper functions (getTierName, getTierFeatures, getMaxDevices)
   - Add createRefreshToken function

2. **server/s01_server-first-app/lib/licensing-db.mjs**
   - Add devices table creation
   - Add indexes for performance

3. **server/s01_server-first-app/lib/licensing-service.mjs**
   - Add checkCustomerLimits method
   - Update activateLicense with device tracking
   - Add device limit enforcement

4. **server/s01_server-first-app/routes/licensing.mjs**
   - Add GET /check-limits endpoint
   - Update activate response with refresh token

---

## Testing Checklist

### Token Generation
- [ ] Token includes all new fields
- [ ] Tier names map correctly (1→standard, 2→premium, 3→professional)
- [ ] Features array matches tier
- [ ] Device limits match tier
- [ ] Token validates with public key

### Device Tracking
- [ ] Device registration works
- [ ] Device limit enforced
- [ ] Duplicate device detection
- [ ] Device count accurate

### Tier Checking
- [ ] Non-existent customer returns appropriate message
- [ ] Existing customer shows correct tier info
- [ ] Device limit calculation correct
- [ ] Upgrade suggestions work

### API Endpoints
- [ ] /check-limits returns correct data
- [ ] /activate enforces device limits
- [ ] Error messages are clear and actionable

---

## Conclusion

**Current Status:** 60% aligned with plan

**Key Gaps:**
1. Enhanced JWT payload (Priority 1)
2. Device tracking and limits (Priority 2 - Task #011)
3. Refresh token mechanism (Priority 4)
4. Client-side integration (Future)

**Recommendation:** Implement Priority 1-3 immediately to complete Task #011 and align with the JWT token plan. Client-side integration (app_token, localStorage migration) can be deferred to Phase 3.

**Estimated Effort:**
- Priority 1: 2-3 hours
- Priority 2: 3-4 hours
- Priority 3: 2-3 hours
- **Total: 7-10 hours**
