# CustMgr License Activation Fix Plan

## Issue Summary
CustMgr licensing server has multiple bugs preventing successful license activation:

1. **Device Count Logic Error**: Reports "Current: 2/2" when database shows 0 devices
2. **Rate Limiting Issues**: Blocks activation attempts even when no attempts recorded
3. **Database Schema Gaps**: Missing required columns discovered during testing

## Database Schema Issues Fixed
✅ **Resolved during testing:**
- `customer_code` - Added with nullable constraint
- `subscription_tier` - Added with default value 1
- `licenses` table - Created with full schema
- `hw_hash` - Added to licenses table
- `revoked` - Added as BOOLEAN DEFAULT FALSE
- `token` - Added as TEXT field
- `license_token` - Added as TEXT field

## Outstanding Issues

### 1. Device Count Logic Bug
**Problem**: CustMgr reports incorrect device counts
- Database query shows: `bruce@imade3d.com` has 0 devices
- CustMgr reports: "Current: 2/2" device limit reached

**Root Cause**: Device counting query in CustMgr activation logic is incorrect

**Fix Required**: Debug and correct device counting SQL query in CustMgr server code

### 2. Rate Limiting Logic
**Problem**: Rate limiting blocks valid activation attempts
- No activation attempts in database for email
- Still returns "Too many activation attempts" error

**Root Cause**: Rate limiting may be:
- IP-based rather than email-based
- Using in-memory counters
- Using Redis/cache instead of database
- Hardcoded time windows

**Fix Required**: Review and adjust rate limiting implementation

## Test Plan

### Phase 1: Database Verification
1. **Verify Schema Completeness**
   ```sql
   DESCRIBE customers;
   DESCRIBE licenses;
   DESCRIBE activation_attempts;
   ```

2. **Verify Data Integrity**
   ```sql
   SELECT c.email, c.subscription_tier, COUNT(l.id) as device_count
   FROM customers c
   LEFT JOIN licenses l ON c.id = l.customer_id 
   WHERE c.email = 'bruce@imade3d.com'
   GROUP BY c.id;
   ```

### Phase 2: CustMgr Code Review
1. **Locate Device Counting Logic**
   - Find activation endpoint code
   - Review device limit checking query
   - Compare with working database query

2. **Review Rate Limiting Implementation**
   - Check if using database vs in-memory
   - Verify rate limit timeouts
   - Check IP vs email-based limiting

### Phase 3: Fix Implementation
1. **Fix Device Count Query**
   ```sql
   -- Correct query should be:
   SELECT COUNT(*) FROM licenses l
   JOIN customers c ON c.id = l.customer_id
   WHERE c.email = ? AND l.revoked = FALSE
   ```

2. **Fix Rate Limiting**
   - Clear any cached rate limits
   - Adjust timeout windows
   - Ensure proper cleanup of expired attempts

### Phase 4: Testing Protocol
1. **Test with Known Good Email**
   ```bash
   curl -X POST http://custmgr.aiprivatesearch.com:56304/api/licensing/activate \
     -H "Content-Type: application/json" \
     -d '{"email":"customer@example.com","hwId":"NEW-HARDWARE-ID","appVersion":"19.83","appId":"aiprivatesearch"}'
   ```

2. **Test Device Limit Enforcement**
   - Activate multiple devices for same email
   - Verify correct device counting
   - Test tier-based limits (Standard: 2, Premium: 5, Professional: unlimited)

3. **Test Rate Limiting**
   - Multiple rapid requests
   - Verify proper timeout behavior
   - Test cleanup of expired attempts

### Phase 5: Integration Testing
1. **Test AIPrivateSearch Client**
   - Remote Mac mini activation
   - License caching behavior
   - Fallback mode handling

2. **Test Multiple Scenarios**
   - New customer activation
   - Existing customer new device
   - Device limit reached
   - License refresh/validation

## Success Criteria
- ✅ New devices can activate successfully
- ✅ Device counts are accurate
- ✅ Rate limiting works without false positives
- ✅ Tier-based device limits enforced correctly
- ✅ Remote Mac mini can activate license
- ✅ AIPrivateSearch client works end-to-end

## Rollback Plan
If fixes cause issues:
1. Revert CustMgr server code changes
2. Restore database backup
3. Use AIPrivateSearch fallback mode for testing
4. Document issues for future fix attempts

## Timeline
- **Phase 1-2**: 2 hours (investigation)
- **Phase 3**: 4 hours (implementation)
- **Phase 4-5**: 2 hours (testing)
- **Total**: 8 hours estimated

## Notes
- Database schema is now complete based on error-driven discovery
- Focus on application logic bugs rather than schema issues
- Test thoroughly before deploying to production
- Consider adding comprehensive logging for future debugging