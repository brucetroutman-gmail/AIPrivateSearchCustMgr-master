import bcrypt from 'bcrypt';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import pool from '../database/connection.mjs';
import { EmailService } from '../email/emailService.mjs';

export class UnifiedUserManager {
  constructor() {
    // Load timeout from app.json
    let bearerTokenTimeout = 300; // Default 5 minutes
    try {
      const appConfigPath = path.join(process.cwd(), '../../client/c01_client-first-app/config/app.json');
      const appConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
      bearerTokenTimeout = appConfig['bearer-token-timeout'] || 300;
    } catch (error) {
      console.log('[AUTH] Could not load app.json, using default timeout:', error.message);
    }
    
    this.sessionTimeout = bearerTokenTimeout * 1000; // Convert to milliseconds
    this.customerSessionTimeout = 30 * 60 * 1000; // 30 minutes for customers
    console.log('[AUTH] Session timeouts - Admin:', bearerTokenTimeout, 'seconds, Customer: 30 minutes');
  }

  async validateLogin(email, password) {
    const connection = await pool.getConnection();
    
    try {
      console.log('[AUTH] Validating login for:', email);
      
      // Try admin users first
      console.log('[AUTH] Checking admin users table...');
      const [adminUsers] = await connection.execute(
        'SELECT id, email, password_hash, role, active FROM users WHERE email = ?',
        [email]
      );
      console.log('[AUTH] Admin users found:', adminUsers.length);
      
      if (adminUsers.length > 0) {
        const user = adminUsers[0];
        if (!user.active) {
          throw new Error('Account is deactivated');
        }
        
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
          throw new Error('Invalid email or password');
        }
        
        return {
          id: user.id,
          email: user.email,
          userRole: user.role,
          userType: 'admin'
        };
      }
      
      // Try customer users
      const [customers] = await connection.execute(
        'SELECT id, email, password_hash, role, active FROM customers WHERE email = ? AND email_verified = 1',
        [email]
      );
      
      if (customers.length > 0) {
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
          userRole: customer.role,
          userType: 'customer'
        };
      }
      
      throw new Error('Invalid email or password');
      
    } catch (error) {
      console.error('[AUTH] Database error:', error.message);
      console.error('[AUTH] Full error:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async createSession(user) {
    const connection = await pool.getConnection();
    
    try {
      const sessionId = crypto.randomBytes(32).toString('hex');
      const timeout = user.userType === 'admin' ? this.sessionTimeout : this.customerSessionTimeout;
      const expiresAt = new Date(Date.now() + timeout);
      
      await connection.execute(
        'INSERT INTO sessions (id, user_id, user_type, expires_at) VALUES (?, ?, ?, ?)',
        [sessionId, user.id, user.userType, expiresAt]
      );
      
      return sessionId;
    } finally {
      connection.release();
    }
  }

  async validateSession(sessionId) {
    const connection = await pool.getConnection();
    
    try {
      const [sessions] = await connection.execute(
        'SELECT user_id, user_type FROM sessions WHERE id = ? AND expires_at > NOW()',
        [sessionId]
      );
      
      if (sessions.length === 0) {
        return null;
      }
      
      const session = sessions[0];
      
      // Get user details based on type
      if (session.user_type === 'admin') {
        const [users] = await connection.execute(
          'SELECT id, email, role, active FROM users WHERE id = ?',
          [session.user_id]
        );
        
        if (users.length === 0 || !users[0].active) {
          return null;
        }
        
        return {
          id: users[0].id,
          email: users[0].email,
          userRole: users[0].role,
          userType: 'admin'
        };
      } else {
        const [customers] = await connection.execute(
          'SELECT id, email, role, active FROM customers WHERE id = ?',
          [session.user_id]
        );
        
        if (customers.length === 0 || !customers[0].active) {
          return null;
        }
        
        return {
          id: customers[0].id,
          email: customers[0].email,
          userRole: customers[0].role,
          userType: 'customer'
        };
      }
    } finally {
      connection.release();
    }
  }

  async destroySession(sessionId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.execute('DELETE FROM sessions WHERE id = ?', [sessionId]);
    } finally {
      connection.release();
    }
  }

  // Admin user management methods
  async getAllUsers() {
    const connection = await pool.getConnection();
    
    try {
      const [users] = await connection.execute(
        'SELECT id, email, role as userRole, active FROM users ORDER BY created_at DESC'
      );
      return users;
    } finally {
      connection.release();
    }
  }

  async createUser(userData) {
    const connection = await pool.getConnection();
    
    try {
      const passwordHash = await bcrypt.hash(userData.password, 12);
      
      const [result] = await connection.execute(
        'INSERT INTO users (email, password_hash, role, active) VALUES (?, ?, ?, ?)',
        [userData.email, passwordHash, userData.userRole, userData.active !== false]
      );
      
      return { userId: result.insertId };
    } finally {
      connection.release();
    }
  }

  async updateUser(userId, userData) {
    const connection = await pool.getConnection();
    
    try {
      let query = 'UPDATE users SET email = ?, role = ?, active = ?';
      let params = [userData.email, userData.userRole, userData.active];
      
      if (userData.password) {
        const passwordHash = await bcrypt.hash(userData.password, 12);
        query += ', password_hash = ?';
        params.push(passwordHash);
      }
      
      query += ' WHERE id = ?';
      params.push(userId);
      
      await connection.execute(query, params);
    } finally {
      connection.release();
    }
  }

  async deleteUser(userId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.execute('DELETE FROM users WHERE id = ?', [userId]);
    } finally {
      connection.release();
    }
  }

  async sendPasswordResetEmail(email) {
    const connection = await pool.getConnection();
    
    try {
      // Check if user exists (admin or customer)
      const [adminUsers] = await connection.execute(
        'SELECT id, email FROM users WHERE email = ?',
        [email]
      );
      
      const [customers] = await connection.execute(
        'SELECT id, email FROM customers WHERE email = ?',
        [email]
      );
      
      if (adminUsers.length === 0 && customers.length === 0) {
        // Don't reveal if email exists
        return;
      }
      
      const user = adminUsers.length > 0 ? adminUsers[0] : customers[0];
      const userType = adminUsers.length > 0 ? 'admin' : 'customer';
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour
      
      // Store reset token
      const table = userType === 'admin' ? 'users' : 'customers';
      await connection.execute(
        `UPDATE ${table} SET reset_token = ?, reset_expires = ? WHERE id = ?`,
        [resetToken, resetExpires, user.id]
      );
      
      // Send email using EmailService
      const emailService = new EmailService();
      await emailService.sendPasswordResetEmail(email, resetToken);
      
    } finally {
      connection.release();
    }
  }
}