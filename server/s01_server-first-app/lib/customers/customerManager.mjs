import crypto from 'crypto';
import bcrypt from 'bcrypt';
import pool from '../database/connection.mjs';

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

  async registerCustomer({ email, phone, city, state, postalCode, password }) {
    const connection = await this.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Check if customer already exists
      const [existing] = await connection.execute(
        'SELECT id, customer_code, email_verified FROM customers WHERE email = ?',
        [email]
      );
      
      if (existing.length > 0) {
        await connection.commit();
        throw new Error('Email already registered. Please verify your email or contact support.');
      }
      
      // Validate password
      if (!this.validatePassword(password)) {
        throw new Error('Password must be at least 8 characters with uppercase, lowercase, and number');
      }
      
      // Generate verification code, customer code, and hash password
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const customerCode = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(password, 12);
      
      // Insert customer with unverified status
      const [customerResult] = await connection.execute(
        `INSERT INTO customers (email, phone, city, state, postal_code, customer_code, password_hash, role, active, email_verified, verification_code, verification_expires, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'customer', 1, 0, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), NOW())`,
        [email, phone, city, state, postalCode, customerCode, passwordHash, verificationCode]
      );
      
      const customerId = customerResult.insertId;
      
      await connection.commit();
      
      return { 
        customerId, 
        verificationCode,
        requiresVerification: true
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  async verifyEmail({ email, code }) {
    const connection = await this.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Check verification code
      const [customers] = await connection.execute(
        'SELECT id, customer_code, verification_code, verification_expires FROM customers WHERE email = ? AND email_verified = 0',
        [email]
      );
      
      if (customers.length === 0) {
        throw new Error('Email not found or already verified');
      }
      
      const customer = customers[0];
      
      if (new Date() > new Date(customer.verification_expires)) {
        throw new Error('Verification code expired');
      }
      
      if (customer.verification_code !== code) {
        throw new Error('Invalid verification code');
      }
      
      // Mark email as verified
      await connection.execute(
        'UPDATE customers SET email_verified = 1, verification_code = NULL, verification_expires = NULL WHERE id = ?',
        [customer.id]
      );
      
      // Update customer with 60-day trial license (tier 1 = Standard)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 60);
      
      await connection.execute(
        `UPDATE customers SET tier = 1, license_status = 'trial', trial_started_at = NOW(), expires_at = ? WHERE id = ?`,
        [expiresAt, customer.id]
      );
      
      await connection.commit();
      
      return {
        customerId: customer.id,
        email,
        licenseKey: customer.customer_code,
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
        'UPDATE customers SET reset_token = ?, reset_expires = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE email = ?',
        [resetCode, email]
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
