import crypto from 'crypto';
import { getDB } from './licensing-db.mjs';
import { createLicenseToken, createRefreshToken, verifyLicenseToken, refreshLicenseToken, hashToken, getTierName, getMaxDevices, getTierFeatures } from './jwt-manager.mjs';

export class LicensingService {
  
  static async activateLicense(email, hwId, appVersion, ipAddress, deviceInfo = {}) {
    const db = getDB();
    const hwHash = crypto.createHash('sha256').update(hwId).digest('hex');
    const deviceId = crypto.randomUUID();

    try {
      // Check activation attempts
      await this.checkActivationAttempts(email, hwHash, ipAddress);

      // Get customer with integrated license info
      const [customers] = await db.execute(
        'SELECT id, tier, license_status, expires_at FROM customers WHERE email = ? AND email_verified = TRUE',
        [email]
      );

      if (customers.length === 0) {
        throw new Error('Customer not found or email not verified. Please register first.');
      }

      const customer = customers[0];
      const tier = customer.tier;
      const maxDevices = getMaxDevices(tier);

      // Check license status
      if (customer.license_status === 'expired' || customer.license_status === 'cancelled') {
        throw new Error(`License ${customer.license_status}. Please renew your subscription.`);
      }

      // Check expiration
      if (customer.expires_at && new Date(customer.expires_at) < new Date()) {
        throw new Error('License expired. Please renew your subscription.');
      }

      // Check existing device
      const [existingDevices] = await db.execute(
        'SELECT device_id FROM devices WHERE customer_id = ? AND hw_hash = ? AND status = "active"',
        [customer.id, hwHash]
      );

      if (existingDevices.length > 0) {
        // Device already registered, generate new token
        const tokenPayload = {
          customerId: customer.id,
          email,
          hwHash,
          deviceId: existingDevices[0].device_id,
          tier,
          appVersion
        };
        const token = createLicenseToken(tokenPayload);
        const refreshToken = createRefreshToken(tokenPayload);
        
        return { 
          token, 
          refreshToken,
          tier,
          features: getTierFeatures(tier),
          deviceLimit: maxDevices,
          devicesUsed: await this.getDeviceCount(customer.id),
          existing: true 
        };
      }

      // Count active devices
      const currentDevices = await this.getDeviceCount(customer.id);

      // Check device limit
      if (currentDevices >= maxDevices) {
        throw new Error(`Device limit reached. Maximum ${maxDevices} devices allowed for ${getTierName(tier)} tier. Current: ${currentDevices}/${maxDevices}`);
      }

      // Register new device
      await db.execute(
        'INSERT INTO devices (customer_id, device_id, hw_hash, device_name, device_info, status) VALUES (?, ?, ?, ?, ?, "active")',
        [customer.id, deviceId, hwHash, deviceInfo.name || 'Unknown Device', JSON.stringify(deviceInfo)]
      );

      // Generate tokens
      const tokenPayload = {
        customerId: customer.id,
        email,
        hwHash,
        deviceId,
        tier,
        appVersion
      };
      const token = createLicenseToken(tokenPayload);
      const refreshToken = createRefreshToken(tokenPayload);

      // Record successful activation
      await this.recordActivationAttempt(email, hwHash, ipAddress, true);

      return { 
        token, 
        refreshToken,
        tier,
        features: getTierFeatures(tier),
        deviceLimit: maxDevices,
        devicesUsed: currentDevices + 1,
        existing: false 
      };
    } catch (error) {
      // Record failed activation
      await this.recordActivationAttempt(email, hwHash, ipAddress, false);
      throw error;
    }
  }

  static async refreshLicense(token) {
    const db = getDB();
    
    try {
      const payload = verifyLicenseToken(token);
      
      // Check if token is revoked
      const tokenHash = hashToken(token);
      const [revoked] = await db.execute(
        'SELECT 1 FROM revocation_list WHERE token_hash = ?',
        [tokenHash]
      );

      if (revoked.length > 0) {
        throw new Error('Token has been revoked');
      }

      // Verify customer and device still exist
      const [customer] = await db.execute(
        'SELECT c.id, c.tier FROM customers c JOIN devices d ON c.id = d.customer_id WHERE c.id = ? AND d.hw_hash = ? AND d.status = "active"',
        [payload.customerId, payload.hwHash]
      );

      if (customer.length === 0) {
        throw new Error('Customer or device not found');
      }

      // Generate new token
      const newTokenPayload = {
        customerId: payload.customerId,
        email: payload.email,
        hwHash: payload.hwHash,
        deviceId: payload.deviceId,
        tier: customer[0].tier,
        appVersion: payload.appVersion
      };
      const newToken = createLicenseToken(newTokenPayload);

      return { token: newToken };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  static async revokeLicense(token, reason = 'Manual revocation') {
    const db = getDB();
    const tokenHash = hashToken(token);

    try {
      const payload = verifyLicenseToken(token);
      
      // Add to revocation list
      await db.execute(
        'INSERT INTO revocation_list (token_hash, customer_id, reason) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reason = ?',
        [tokenHash, payload.customerId, reason, reason]
      );

      // Deactivate device
      await db.execute(
        'UPDATE devices SET status = "revoked" WHERE customer_id = ? AND hw_hash = ?',
        [payload.customerId, payload.hwHash]
      );

      return { success: true };
    } catch (error) {
      throw new Error(`License revocation failed: ${error.message}`);
    }
  }

  static async validateLicense(token) {
    const db = getDB();
    
    try {
      const payload = verifyLicenseToken(token);
      
      // Check revocation
      const tokenHash = hashToken(token);
      const [revoked] = await db.execute(
        'SELECT 1 FROM revocation_list WHERE token_hash = ?',
        [tokenHash]
      );

      if (revoked.length > 0) {
        return { valid: false, reason: 'Token revoked' };
      }

      // Check customer and device exist and are active
      const [result] = await db.execute(
        'SELECT c.tier, c.license_status, c.expires_at FROM customers c JOIN devices d ON c.id = d.customer_id WHERE c.id = ? AND d.hw_hash = ? AND d.status = "active"',
        [payload.customerId, payload.hwHash]
      );

      if (result.length === 0) {
        return { valid: false, reason: 'Customer or device not found' };
      }

      const customer = result[0];
      
      // Check license status
      if (customer.license_status === 'expired' || customer.license_status === 'cancelled') {
        return { valid: false, reason: `License ${customer.license_status}` };
      }

      // Check expiration
      if (customer.expires_at && new Date(customer.expires_at) < new Date()) {
        return { valid: false, reason: 'License expired' };
      }

      return { valid: true, payload };
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }

  static async checkCustomerLimits(email) {
    const db = getDB();
    
    try {
      // Get customer
      const [customers] = await db.execute(
        'SELECT id, tier, created_at FROM customers WHERE email = ?',
        [email]
      );
      
      if (customers.length === 0) {
        return {
          exists: false,
          message: 'Customer not found. Please register first.'
        };
      }
      
      const customer = customers[0];
      const tier = customer.tier;
      const tierName = getTierName(tier);
      const maxDevices = getMaxDevices(tier);
      const features = getTierFeatures(tier);
      
      // Count active devices
      const currentDevices = await this.getDeviceCount(customer.id);
      
      // Get device list
      const [deviceList] = await db.execute(
        'SELECT device_id, device_name, hw_hash, first_seen, last_seen FROM devices WHERE customer_id = ? AND status = "active" ORDER BY last_seen DESC',
        [customer.id]
      );
      
      return {
        exists: true,
        customerId: customer.id,
        tier,
        tierName,
        maxDevices,
        currentDevices,
        availableSlots: maxDevices - currentDevices,
        canActivate: currentDevices < maxDevices,
        features,
        devices: deviceList,
        message: currentDevices >= maxDevices 
          ? `Device limit reached (${currentDevices}/${maxDevices}). ${tier < 3 ? `Upgrade to ${getTierName(tier + 1)} tier for more devices.` : 'Maximum tier reached.'}`
          : `${maxDevices - currentDevices} device slot(s) available.`
      };
    } catch (error) {
      throw new Error(`Failed to check customer limits: ${error.message}`);
    }
  }

  static async getDeviceCount(customerId) {
    const db = getDB();
    const [devices] = await db.execute(
      'SELECT COUNT(*) as count FROM devices WHERE customer_id = ? AND status = "active"',
      [customerId]
    );
    return devices[0].count;
  }

  static async checkActivationAttempts(email, hwHash, ipAddress) {
    const db = getDB();
    const maxAttempts = 5;
    const timeWindow = 3600; // 1 hour

    const [attempts] = await db.execute(
      'SELECT attempts FROM activation_attempts WHERE email = ? AND hw_hash = ? AND ip_address = ? AND last_attempt > DATE_SUB(NOW(), INTERVAL ? SECOND)',
      [email, hwHash, ipAddress, timeWindow]
    );

    if (attempts.length > 0 && attempts[0].attempts >= maxAttempts) {
      throw new Error('Too many activation attempts. Please try again later.');
    }
  }

  static async recordActivationAttempt(email, hwHash, ipAddress, success) {
    const db = getDB();
    
    await db.execute(
      `INSERT INTO activation_attempts (email, hw_hash, ip_address, attempts, success) 
       VALUES (?, ?, ?, 1, ?) 
       ON DUPLICATE KEY UPDATE 
       attempts = attempts + 1, 
       last_attempt = CURRENT_TIMESTAMP, 
       success = ?`,
      [email, hwHash, ipAddress, success, success]
    );
  }
}