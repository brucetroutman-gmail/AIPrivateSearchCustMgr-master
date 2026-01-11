# AIPS Device-Based Licensing Implementation Plan

## Overview
Replace JWT token-based licensing with simple device registration system to eliminate token expiration issues.

## Phase 1: Database Schema (v1.42)

### 1.1 Verify Existing Schema
- [x] `devices` table already exists with correct structure
- [x] `customers` table has `tier` column
- [x] Foreign key relationships established

### 1.2 Database Validation
```sql
-- Verify devices table structure
DESCRIBE devices;

-- Check existing device registrations
SELECT COUNT(*) FROM devices;

-- Verify customer tier data
SELECT email, tier FROM customers WHERE email = 'bruce.troutman@gmail.com';
```

## Phase 2: New API Endpoints (v1.42)

### 2.1 Create Device Registration Endpoint
**File**: `server/s01_server-first-app/routes/licensing.mjs`

**Endpoint**: `POST /api/licensing/register-device`
- Input: `{ email, deviceUuid, deviceName }`
- Logic: Find/create customer, register device
- Output: `{ success, customer: { email, tier } }`

### 2.2 Create Device Validation Endpoint
**File**: `server/s01_server-first-app/routes/licensing.mjs`

**Endpoint**: `POST /api/licensing/validate-device`
- Input: `{ email, deviceUuid, deviceName }`
- Logic: Verify customer exists, check device registration
- Output: `{ valid, customer, device }` or `{ valid: false, reason }`

### 2.3 Update Existing Activate Endpoint
**File**: `server/s01_server-first-app/routes/licensing.mjs`

**Enhancement**: Add device registration to existing `/activate` endpoint
- Keep existing JWT functionality for backward compatibility
- Add optional device registration if `deviceUuid` provided

## Phase 3: Service Layer Updates (v1.42)

### 3.1 Create Device Service
**File**: `server/s01_server-first-app/lib/device-service.mjs`

**Functions**:
- `registerDevice(customerId, deviceUuid, deviceName)`
- `validateDevice(customerId, deviceUuid)`
- `getCustomerDevices(customerId)`
- `updateDeviceLastSeen(deviceId)`

### 3.2 Update Licensing Service
**File**: `server/s01_server-first-app/lib/licensing-service.mjs`

**Enhancements**:
- Add device registration methods
- Integrate with existing customer lookup
- Maintain JWT functionality for compatibility

## Phase 4: Testing (v1.42)

### 4.1 API Testing
```bash
# Test device registration
curl -X POST http://localhost:56304/api/licensing/register-device \
  -H "Content-Type: application/json" \
  -d '{"email": "bruce.troutman@gmail.com", "deviceUuid": "test-123", "deviceName": "Test Device"}'

# Test device validation
curl -X POST http://localhost:56304/api/licensing/validate-device \
  -H "Content-Type: application/json" \
  -d '{"email": "bruce.troutman@gmail.com", "deviceUuid": "test-123"}'
```

### 4.2 AIPS Integration Testing
1. Clear AIPS localStorage
2. Test registration flow with new endpoints
3. Verify device persistence across sessions
4. Test multiple device scenarios

## Phase 5: AIPS Client Updates (Separate)

### 5.1 Update AIPS Client (Future)
- Replace JWT token storage with device UUID
- Use `/validate-device` instead of JWT validation
- Implement device registration on first launch

## Implementation Priority

### High Priority (v1.42)
1. ✅ Database schema verification
2. 🔄 Create device registration endpoint
3. 🔄 Create device validation endpoint
4. 🔄 Basic testing with curl

### Medium Priority (v1.43)
1. Update existing activate endpoint
2. Create device service layer
3. Admin interface for device management
4. Comprehensive testing

### Low Priority (Future)
1. AIPS client integration
2. Device limit enforcement
3. Device management UI enhancements

## Files to Modify

### New Files
- `server/s01_server-first-app/lib/device-service.mjs`

### Modified Files
- `server/s01_server-first-app/routes/licensing.mjs`
- `server/s01_server-first-app/lib/licensing-service.mjs`

## Success Criteria

### v1.42 Success
- [x] Device registration endpoint working
- [x] Device validation endpoint working  
- [x] Database properly storing device data
- [x] Basic curl testing passes

### v1.43 Success
- [ ] AIPS client can register devices
- [ ] AIPS client can validate without JWT
- [ ] Multiple devices per customer supported
- [ ] Admin can view/manage devices

## Risk Mitigation

### Backward Compatibility
- Keep existing JWT endpoints functional
- Add device registration as enhancement, not replacement
- Test both JWT and device-based flows

### Data Integrity
- Proper foreign key constraints
- Device UUID uniqueness enforcement
- Customer email validation

### Performance
- Index on device_uuid for fast lookups
- Index on customer_id for device queries
- Efficient last_seen updates