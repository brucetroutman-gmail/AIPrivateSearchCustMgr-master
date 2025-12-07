# CustMgr JWT Token Strategy & LocalStorage Cleanup Plan

## **Current State Analysis**

### **Existing Token Storage Issues**
- **Multiple storage systems**: localStorage, app_token, encrypted files
- **Inconsistent data**: License info scattered across storage methods
- **Legacy localStorage keys**: userRole, userEmail, sessionId, selectedModel, etc.
- **No centralized management**: Different components access storage directly

### **Current AIPrivateSearch app_token Structure**
```javascript
AppToken.get('user.email')           // User email
AppToken.get('user.role')            // Subscription tier (standard/premium/professional)
AppToken.get('ui.theme')             // UI preferences
AppToken.get('search.model')         // Selected search model
AppToken.get('search.collection')    // Selected collection
```

## **Phase 1: JWT Token Design (Week 1)**

### **1.1 Enhanced JWT Payload Structure**
```json
{
  // Standard JWT claims
  "iss": "custmgr.aiprivatesearch.com",
  "sub": "customer_id_12345",
  "aud": "aiprivatesearch",
  "exp": 1735689600,
  "iat": 1735603200,
  "jti": "token_unique_id",
  
  // Customer information
  "email": "user@example.com",
  "customer_id": "cust_12345",
  "subscription_id": "sub_67890",
  
  // Subscription details
  "tier": 2,
  "tier_name": "premium",
  "status": "active",
  "trial_end": null,
  "current_period_end": 1767225600,
  
  // Device binding
  "device_id": "dev_abc123",
  "hardware_hash": "sha256_hash",
  "device_name": "MacBook Pro",
  
  // Feature permissions
  "features": [
    "search", "multi-mode", "collections", 
    "models", "config", "doc-index"
  ],
  
  // Usage limits
  "max_devices": 5,
  "current_devices": 2,
  
  // Security
  "token_version": 2,
  "requires_refresh": false
}
```

### **1.2 Token Security Enhancements**
- **Shorter expiration**: 24-hour tokens with refresh mechanism
- **Token versioning**: Ability to invalidate old token formats
- **Device fingerprinting**: Enhanced hardware binding
- **Refresh tokens**: Separate long-lived refresh tokens

## **Phase 2: Unified Storage Strategy (Week 2)**

### **2.1 app_token Integration with JWT**
```javascript
// New unified structure
AppToken.set('license.jwt', jwt_token)
AppToken.set('license.refresh_token', refresh_token)
AppToken.set('license.expires_at', timestamp)
AppToken.set('license.customer_id', customer_id)

// Derived from JWT (cached for performance)
AppToken.set('user.email', email)
AppToken.set('user.tier', tier_number)
AppToken.set('user.tier_name', tier_name)
AppToken.set('user.features', features_array)

// UI preferences (unchanged)
AppToken.set('ui.theme', theme)
AppToken.set('search.model', model)
AppToken.set('search.collection', collection)
```

### **2.2 LocalStorage Migration Strategy**
```javascript
// Migration function to clean up localStorage
function migrateToAppToken() {
  // Migrate existing data
  const migrations = {
    'userEmail': 'user.email',
    'userRole': 'user.tier_name', 
    'theme': 'ui.theme',
    'selectedModel': 'search.model',
    'selectedCollection': 'search.collection'
  };
  
  // Copy data to app_token
  Object.entries(migrations).forEach(([oldKey, newKey]) => {
    const value = localStorage.getItem(oldKey);
    if (value) AppToken.set(newKey, value);
  });
  
  // Clean up localStorage
  const keysToRemove = [
    'userEmail', 'userRole', 'userUserRole', 'sessionId',
    'selectedModel', 'selectedCollection', 'selectedScoreModel',
    'theme', 'developerMode', 'licenseStatus'
  ];
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
}
```

## **Phase 3: CustMgr Token Management (Week 3)**

### **3.1 Enhanced Token Endpoints**
```javascript
// New CustMgr API endpoints
POST /api/auth/token          // Issue new JWT token
POST /api/auth/refresh        // Refresh expired token
POST /api/auth/revoke         // Revoke token/device
GET  /api/auth/validate       // Validate token
POST /api/auth/device         // Register new device
```

### **3.2 Token Lifecycle Management**
- **Automatic refresh**: 1 hour before expiration
- **Device registration**: First-time device setup
- **Token revocation**: Security incidents or device removal
- **Bulk refresh**: Security updates or policy changes

### **3.3 Enhanced Security Features**
- **Rate limiting**: Token requests per device/IP
- **Anomaly detection**: Unusual token usage patterns
- **Audit logging**: All token operations logged
- **Emergency revocation**: Instant token invalidation

## **Phase 4: AIPrivateSearch Integration (Week 4)**

### **4.1 New License Manager**
```javascript
class UnifiedLicenseManager {
  async initialize() {
    // Migrate from localStorage if needed
    await this.migrateStorage();
    
    // Load JWT from app_token
    const jwt = AppToken.get('license.jwt');
    if (jwt) {
      await this.validateToken(jwt);
    } else {
      await this.requireActivation();
    }
  }
  
  async validateToken(jwt) {
    // Local validation first
    const payload = this.decodeJWT(jwt);
    if (this.isExpired(payload)) {
      return await this.refreshToken();
    }
    
    // Update app_token with JWT data
    this.syncTokenData(payload);
    return true;
  }
  
  async refreshToken() {
    const refreshToken = AppToken.get('license.refresh_token');
    const newJWT = await this.callCustMgr('/api/auth/refresh', {
      refresh_token: refreshToken
    });
    
    AppToken.set('license.jwt', newJWT);
    return true;
  }
}
```

### **4.2 Backward Compatibility Layer**
```javascript
// Maintain compatibility with existing code
function getUserRole() {
  return AppToken.get('user.tier_name') || 'standard';
}

function getUserEmail() {
  return AppToken.get('user.email') || '';
}

function isFeatureAllowed(feature) {
  const features = AppToken.get('user.features') || [];
  return features.includes(feature);
}
```

## **Phase 5: Storage Cleanup & Optimization (Week 5)**

### **5.1 Complete LocalStorage Elimination**
- **Remove all localStorage usage** from licensing system
- **Migrate user preferences** to app_token structure
- **Update all components** to use app_token API
- **Add migration warnings** for users with old data

### **5.2 Performance Optimizations**
- **Token caching**: In-memory cache for decoded JWT data
- **Lazy loading**: Load token data only when needed
- **Batch operations**: Group multiple app_token operations
- **Compression**: Compress large token payloads

### **5.3 Error Handling & Recovery**
- **Graceful degradation**: Fallback modes for token failures
- **User messaging**: Clear error messages for license issues
- **Automatic recovery**: Self-healing for common problems
- **Debug logging**: Detailed logs for troubleshooting

## **Phase 6: Testing & Deployment (Week 6)**

### **6.1 Migration Testing**
- **Data integrity**: Verify all data migrates correctly
- **Performance testing**: Ensure no performance regression
- **Edge cases**: Test with corrupted/missing data
- **Cross-browser**: Test storage behavior across browsers

### **6.2 Rollback Strategy**
- **Feature flags**: Gradual rollout of new system
- **Rollback mechanism**: Quick revert to old system
- **Data backup**: Preserve old localStorage during transition
- **Monitoring**: Real-time monitoring of migration success

## **Benefits of New Architecture**

### **Security Improvements**
- **Centralized token management**: Single source of truth
- **Enhanced encryption**: Better protection of sensitive data
- **Audit trail**: Complete history of token operations
- **Device binding**: Stronger hardware-based security

### **Performance Benefits**
- **Reduced API calls**: Longer-lived tokens with refresh
- **Better caching**: Intelligent token caching strategy
- **Faster startup**: Optimized token validation
- **Offline support**: Extended offline operation capability

### **Maintenance Advantages**
- **Cleaner codebase**: Unified storage API
- **Better debugging**: Centralized error handling
- **Easier updates**: Single point for storage changes
- **Future-proof**: Extensible token structure

This plan transforms the current fragmented storage approach into a unified, secure, and maintainable JWT-based system while cleaning up legacy localStorage usage.