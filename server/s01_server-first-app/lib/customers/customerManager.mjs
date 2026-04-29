import crypto from 'crypto';
import bcrypt from 'bcrypt';
import pool from '../database/connection.mjs';
import { getSettings } from '../settings-loader.mjs';

// Pending registrations — not saved to DB until email verified
const pendingRegistrations = new Map();

export class CustomerManager {
  async getConnection() {
    return await pool.getConnection();
  }

  validatePassword(password) {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    return minLength && hasUpper && hasLower && hasNumber;
  }

  async registerCustomer({ email, phone, city, state, postalCode, password, ipAddress }) {
    // Check if already a verified customer in DB
    const connection = await this.getConnection();
    try {
      const [existing] = await connection.execute(
        'SELECT id, email_verified FROM customers WHERE email = ?',
        [email]
      );
      if (existing.length > 0 && existing[0].email_verified) {
        throw new Error('Email already registered. Please log in or reset your password.');
      }
    } finally {
      connection.release();
    }

    if (!this.validatePassword(password)) {
      throw new Error('Password must be at least 8 characters with uppercase, lowercase, and number');
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + getSettings().verification_expiry_minutes * 60 * 1000);
    const customerCode = crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(password, 12);

    pendingRegistrations.set(email.toLowerCase(), {
      email, phone, city, state, postalCode, customerCode, ipAddress,
      passwordHash, verificationCode, expiresAt
    });

    return { verificationCode, requiresVerification: true };
  }
  
  async verifyEmail({ email, code }) {
    const key = email.toLowerCase();
    const pending = pendingRegistrations.get(key);

    if (!pending) {
      throw new Error('No pending registration found. Please register again.');
    }

    if (new Date() > pending.expiresAt) {
      pendingRegistrations.delete(key);
      throw new Error('Verification code expired. Please register again.');
    }

    if (pending.verificationCode !== code) {
      throw new Error('Invalid verification code');
    }

    // Code is valid — now insert into DB
    const connection = await this.getConnection();
    try {
      await connection.beginTransaction();

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + getSettings().trial_period_days);

      const [result] = await connection.execute(
        `INSERT INTO customers (email, phone, city, state, postal_code, customer_code, customer_ipaddr, password_hash, role, active, email_verified, tier, license_status, trial_started_at, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'customer', 1, 1, 1, 'trial', NOW(), ?, NOW())`,
        [pending.email, pending.phone, pending.city, pending.state, pending.postalCode,
         pending.customerCode, pending.ipAddress, pending.passwordHash, expiresAt]
      );

      await connection.commit();
      pendingRegistrations.delete(key);

      return {
        customerId: result.insertId,
        email: pending.email,
        licenseKey: pending.customerCode,
        tier: 1,
        expiresAt
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async resendVerificationCode(email) {
    const key = email.toLowerCase();
    const pending = pendingRegistrations.get(key);

    if (!pending) {
      throw new Error('No pending registration found. Please register again.');
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + getSettings().verification_expiry_minutes * 60 * 1000);
    pending.verificationCode = verificationCode;
    pending.expiresAt = expiresAt;

    return { verificationCode };
  }

  async requestPasswordReset(email) {
    const connection = await this.getConnection();
    
    try {
      // Check if customer exists
      const [customers] = await connection.execute(
        'SELECT id FROM customers WHERE email = ? AND email_verified = 1',
        [email]
      );
      
      if (customers.length === 0) {
        throw new Error('Email not found or not verified');
      }
      
      // Generate 6-digit reset code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store reset code with 15 minute expiry
      await connection.execute(
        'UPDATE customers SET reset_token = ?, reset_expires = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE email = ?',
        [resetCode, getSettings().password_reset_expiry_minutes, email]
      );
      
      return { resetCode };
    } finally {
      connection.release();
    }
  }

  async resetPassword(code, newPassword) {
    const connection = await this.getConnection();
    
    try {
      // Validate password
      if (!this.validatePassword(newPassword)) {
        throw new Error('Password must be at least 8 characters with uppercase, lowercase, and number');
      }
      
      // Check reset code
      const [customers] = await connection.execute(
        'SELECT id, email FROM customers WHERE reset_token = ? AND reset_expires > NOW()',
        [code]
      );
      
      if (customers.length === 0) {
        throw new Error('Invalid or expired reset code');
      }
      
      const customer = customers[0];
      const passwordHash = await bcrypt.hash(newPassword, 12);
      
      // Update password and clear reset token
      await connection.execute(
        'UPDATE customers SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?',
        [passwordHash, customer.id]
      );
      
      return { email: customer.email };
    } finally {
      connection.release();
    }
  }

  async validateCustomerLogin(email, password) {
    const connection = await this.getConnection();
    
    try {
      const [customers] = await connection.execute(
        'SELECT id, email, password_hash, role, active FROM customers WHERE email = ? AND email_verified = 1',
        [email]
      );
      
      if (customers.length === 0) {
        throw new Error('Invalid email or password');
      }
      
      const customer = customers[0];
      
      if (!customer.active) {
        throw new Error('Account is deactivated');
      }
      
      const validPassword = await bcrypt.compare(password, customer.password_hash);
      if (!validPassword) {
        throw new Error('Invalid email or password');
      }
      
      return {
        id: customer.id,
        email: customer.email,
        role: customer.role
      };
    } finally {
      connection.release();
    }
  }
}
