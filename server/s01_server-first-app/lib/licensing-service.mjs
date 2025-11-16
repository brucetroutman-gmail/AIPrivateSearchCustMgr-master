import crypto from 'crypto';
import { getDB } from './licensing-db.mjs';
import { createLicenseToken, verifyLicenseToken, refreshLicenseToken, hashToken } from './jwt-manager.mjs';

export class LicensingService {
  
  static async activateLicense(email, hwId, appVersion, ipAddress) {
    const db = getDB();
    const hwHash = crypto.createHash('sha256').update(hwId).digest('hex');

    try {
      // Check activation attempts
      await this.checkActivationAttempts(email, hwHash, ipAddress);

      // Create or get customer
      const customerId = await this.getOrCreateCustomer(email);

      // Check existing license
      const [existing] = await db.execute(
        'SELECT * FROM licenses WHERE customer_id = ? AND hw_hash = ? AND revoked = FALSE AND expires_at > NOW()',
        [customerId, hwHash]
      );

      if (existing.length > 0) {
        return { token: existing[0].token, existing: true };
      }

      // Get customer subscription tier
      const [customer] = await db.execute(
        'SELECT subscription_tier FROM customers WHERE id = ?',
        [customerId]
      );

      // Generate new license token
      const token = createLicenseToken({
        customerId,
        email,
        hwHash,
        subscriptionTier: customer[0].subscription_tier,
        appVersion
      });

      // Save license
      await db.execute(
        'INSERT INTO licenses (customer_id, hw_hash, token, expires_at, app_version) VALUES (?, ?, ?, FROM_UNIXTIME(?), ?)',
        [customerId, hwHash, token, Math.floor(Date.now() / 1000) + (30 * 24 * 3600), appVersion]
      );

      // Record successful activation
      await this.recordActivationAttempt(email, hwHash, ipAddress, true);

      return { token, existing: false };
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

      // Generate new token
      const newToken = refreshLicenseToken(token);

      // Update license record
      await db.execute(
        'UPDATE licenses SET token = ?, expires_at = FROM_UNIXTIME(?) WHERE customer_id = ? AND hw_hash = ?',
        [newToken, payload.exp, payload.sub, payload.hw]
      );

      return { token: newToken };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  static async revokeLicense(token, reason = 'Manual revocation') {
    const db = getDB();
    const tokenHash = hashToken(token);

    try {
      // Add to revocation list
      await db.execute(
        'INSERT INTO revocation_list (token_hash, reason) VALUES (?, ?) ON DUPLICATE KEY UPDATE reason = ?',
        [tokenHash, reason, reason]
      );

      // Mark license as revoked
      await db.execute(
        'UPDATE licenses SET revoked = TRUE WHERE token = ?',
        [token]
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

      // Check license exists and is active
      const [license] = await db.execute(
        'SELECT * FROM licenses WHERE customer_id = ? AND hw_hash = ? AND revoked = FALSE',
        [payload.sub, payload.hw]
      );

      if (license.length === 0) {
        return { valid: false, reason: 'License not found' };
      }

      return { valid: true, payload };
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }

  static async getOrCreateCustomer(email) {
    const db = getDB();
    
    try {
      // Try to get existing customer
      const [existing] = await db.execute(
        'SELECT id FROM customers WHERE email = ?',
        [email]
      );

      if (existing.length > 0) {
        return existing[0].id;
      }

      // Create new customer
      const [result] = await db.execute(
        'INSERT INTO customers (email) VALUES (?)',
        [email]
      );

      return result.insertId;
    } catch (error) {
      throw new Error(`Customer creation failed: ${error.message}`);
    }
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