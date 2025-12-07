# Changelog - AI Private Search Customer Manager

## Version 1.22 - JWT Enhancement & Device Tracking (2024)

### 🎯 Major Features

#### Enhanced JWT Token System
- **Complete JWT Payload**: Added all standard claims (iss, aud, jti) and custom fields
- **Tier-Based Features**: Tokens now include feature arrays based on subscription tier
- **Device Limits**: Automatic enforcement of device limits per tier (2/5/10)
- **Dual Token System**: 24-hour access tokens + 30-day refresh tokens
- **Token Versioning**: Added version tracking for future token format changes

#### Device Tracking & Management
- **New Devices Table**: Track all customer devices with status management
- **Hardware Binding**: SHA-256 hardware ID hashing for device identification
- **Device Metadata**: Store device name, info, first/last seen timestamps
- **Status Tracking**: Active, inactive, and revoked device states

#### Tier Checking System
- **Customer Limits API**: New endpoint to check tier and device availability
- **Smart Error Messages**: Contextual messages with upgrade suggestions
- **Device Slot Tracking**: Real-time available slots calculation
- **Feature Discovery**: Clients can query available features per tier

### 📝 API Changes

#### New Endpoints
- `GET /api/licensing/check-limits?email=user@example.com` - Check customer tier and device limits

#### Modified Endpoints
- `POST /api/licensing/activate` - Now returns both access and refresh tokens
  - Added `refresh_token` field
  - Added `expires_in` field (86400 seconds)
  - Enforces device limits
  - Registers devices in tracking table

#### Enhanced Responses
All token responses now include:
```json
{
  "token": "access-token",
  "refresh_token": "refresh-token",
  "expires_in": 86400
}
```

### 🔧 Technical Changes

#### Database Schema
**New Table: `devices`**
```sql
CREATE TABLE devices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  device_id VARCHAR(255) UNIQUE NOT NULL,
  hw_hash VARCHAR(64) NOT NULL,
  device_name VARCHAR(255),
  device_info JSON,
  first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  status ENUM('active', 'inactive', 'revoked') DEFAULT 'active',
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

#### JWT Payload Structure
**Before:**
```json
{
  "sub": 1,
  "email": "user@example.com",
  "hw": "hash",
  "tier": 1,
  "ver": "19.61"
}
```

**After:**
```json
{
  "iss": "custmgr.aiprivatesearch.com",
  "sub": 1,
  "aud": "aiprivatesearch",
  "jti": "uuid",
  "email": "user@example.com",
  "customer_id": 1,
  "tier": 1,
  "tier_name": "standard",
  "status": "active",
  "hw": "hash",
  "device_id": "uuid",
  "features": ["search", "collections"],
  "max_devices": 2,
  "current_devices": 1,
  "app": "aiprivatesearch",
  "ver": "19.61",
  "token_version": 2,
  "token_type": "access"
}
```

#### Code Changes

**Modified Files:**
1. `server/s01_server-first-app/lib/jwt-manager.mjs`
   - Enhanced `createLicenseToken()` with complete payload
   - Added `createRefreshToken()` function
   - Added helper functions: `getTierName()`, `getTierFeatures()`, `getMaxDevices()`

2. `server/s01_server-first-app/lib/licensing-db.mjs`
   - Added `devices` table creation
   - Added indexes for performance

3. `server/s01_server-first-app/lib/licensing-service.mjs`
   - Updated `activateLicense()` with device tracking
   - Added device limit enforcement
   - Added `checkCustomerLimits()` method
   - Enhanced error messages

4. `server/s01_server-first-app/routes/licensing.mjs`
   - Added `GET /check-limits` endpoint

### 🎨 Tier Configuration

| Tier | Name | Max Devices | Features |
|------|------|-------------|----------|
| 1 | standard | 2 | search, collections |
| 2 | premium | 5 | search, multi-mode, collections, models |
| 3 | professional | 10 | search, multi-mode, collections, models, config, doc-index |

### 🔒 Security Enhancements
- Device limit enforcement prevents unauthorized device proliferation
- Hardware binding ensures tokens are device-specific
- Token versioning allows for emergency token invalidation
- Separate refresh tokens reduce access token exposure

### 📚 Documentation
- Created `jwt-implementation-review.md` - Comparison with JWT plan
- Created `jwt-testing-guide.md` - Comprehensive testing procedures
- Updated `custmgr-app-review.md` - Added development workflow
- Created `deployment-workflow.md` - Deployment procedures

### 🐛 Bug Fixes
- Fixed token expiration to 24 hours (was 30 days)
- Added proper device counting for limit enforcement
- Improved error messages for device limit scenarios

### ⚠️ Breaking Changes
- Access tokens now expire in 24 hours (previously 30 days)
- Activation endpoint now requires device info parameter (optional)
- Token payload structure significantly expanded

### 🔄 Migration Notes
- Existing tokens will continue to work until expiration
- New tokens will use enhanced payload structure
- Devices table will be auto-created on server restart
- No manual migration required

### 📊 Performance Impact
- Minimal: Added one device table lookup per activation
- Device counting query is indexed for performance
- Token size increased by ~200 bytes (still well within limits)

---

## Version 1.21 - Previous Release

### Features
- Authentication system with session management
- Basic JWT licensing with RS256
- Rate limiting and security middleware
- PM2 process management
- Cross-platform support (macOS/Ubuntu)
- Caddy reverse proxy compatibility

---

## Upgrade Instructions

### From v1.21 to v1.22

1. **Pull latest code:**
   ```bash
   git pull origin main
   ```

2. **Restart server:**
   ```bash
   # macOS
   ./start.sh
   
   # Ubuntu (PM2)
   pm2 restart ecosystem.config.cjs
   ```

3. **Verify database:**
   ```sql
   USE aiprivatesearch;
   SHOW TABLES LIKE 'devices';
   ```

4. **Test new endpoint:**
   ```bash
   curl "http://localhost:56304/api/licensing/check-limits?email=test@example.com"
   ```

5. **Update client applications:**
   - Handle new `refresh_token` field in activation response
   - Implement token refresh logic before 24-hour expiration
   - Use new `features` array for feature gating

---

## Known Issues
- None at this time

## Roadmap
- Admin dashboard for device management
- Device revocation API
- Bulk device operations
- Usage analytics per device
- Client-side UnifiedLicenseManager integration

---

**Contributors:** Amazon Q Developer  
**Review Date:** 2024  
**Status:** Production Ready
