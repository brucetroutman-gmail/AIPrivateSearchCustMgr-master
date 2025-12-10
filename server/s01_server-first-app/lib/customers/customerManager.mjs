import mysql from 'mysql2/promise';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export class CustomerManager {
  constructor() {
    this.dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'aiprivatesearch'
    };
  }

  async getConnection() {
    return await mysql.createConnection(this.dbConfig);
  }

  async registerCustomer({ email, phone, city, state, postalCode }) {
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
      
      // Generate verification code and customer code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const customerCode = crypto.randomBytes(16).toString('hex');
      
      // Insert customer with unverified status
      const [customerResult] = await connection.execute(
        `INSERT INTO customers (email, phone, city, state, postal_code, customer_code, email_verified, verification_code, verification_expires, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), NOW())`,
        [email, phone, city, state, postalCode, customerCode, verificationCode]
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
      await connection.end();
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
      
      // Create 60-day trial license (tier 1 = Standard)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 60);
      
      await connection.execute(
        `INSERT INTO licenses (customer_id, tier, status, trial_started_at, expires_at, created_at) 
         VALUES (?, 1, 'trial', NOW(), ?, NOW())`,
        [customer.id, expiresAt]
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
      await connection.end();
    }
  }
}
