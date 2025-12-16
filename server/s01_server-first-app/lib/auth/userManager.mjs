import pool from '../database/connection.mjs';
import crypto from 'crypto';

export class UserManager {
  constructor() {
    // Using database
  }

  generateId() {
    return crypto.randomUUID();
  }

  hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  async authenticateUser(email, password) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [users] = await connection.execute(
        'SELECT * FROM users WHERE email = ? AND status = "active"',
        [email]
      );

      if (users.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = users[0];
      const hashedPassword = this.hashPassword(password);

      if (user.password_hash !== hashedPassword) {
        throw new Error('Invalid credentials');
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        userRole: user.role,
        active: user.status === 'active'
      };
    } finally {
      if (connection) connection.release();
    }
  }

  async getTokenTimeout() {
    return 300 * 1000; // 5 minutes
  }

  async createSession(userId) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const sessionId = this.generateId();
      const expirationTime = await this.getTokenTimeout();
      const expiresAt = new Date(Date.now() + expirationTime);

      await connection.execute(
        'INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)',
        [userId, sessionId, expiresAt]
      );

      return sessionId;
    } finally {
      if (connection) connection.release();
    }
  }

  async validateSession(sessionId) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [sessions] = await connection.execute(
        'SELECT * FROM sessions WHERE session_token = ? AND expires_at > NOW()',
        [sessionId]
      );

      if (sessions.length === 0) {
        return null;
      }

      const session = sessions[0];
      const [users] = await connection.execute(
        'SELECT * FROM users WHERE id = ? AND status = "active"',
        [session.user_id]
      );

      if (users.length === 0) {
        return null;
      }

      const user = users[0];
      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        userRole: user.role,
        active: user.status === 'active'
      };
    } finally {
      if (connection) connection.release();
    }
  }

  async deleteSession(sessionId) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      await connection.execute(
        'DELETE FROM sessions WHERE session_token = ?',
        [sessionId]
      );
    } finally {
      if (connection) connection.release();
    }
  }

  async createUser(email, password, role = 'manager') {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const hashedPassword = this.hashPassword(password);
      const [result] = await connection.execute(
        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
        [email, hashedPassword, role]
      );
      
      return {
        id: result.insertId,
        email,
        userRole: role,
        active: true
      };
    } finally {
      if (connection) connection.release();
    }
  }

  async getAllUsers() {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [users] = await connection.execute(
        'SELECT id, email, first_name, last_name, role, status, created_at FROM users ORDER BY created_at DESC'
      );
      
      return users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userRole: user.role,
        active: user.status === 'active',
        createdAt: user.created_at
      }));
    } finally {
      if (connection) connection.release();
    }
  }

  async updateUser(userId, updates) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const fields = [];
      const values = [];
      
      if (updates.email) {
        fields.push('email = ?');
        values.push(updates.email);
      }
      if (updates.password) {
        fields.push('password_hash = ?');
        values.push(this.hashPassword(updates.password));
      }
      if (updates.userRole) {
        fields.push('role = ?');
        values.push(updates.userRole);
      }
      if (updates.isActive !== undefined) {
        fields.push('status = ?');
        values.push(updates.isActive ? 'active' : 'inactive');
      }
      
      if (fields.length === 0) {
        return null;
      }
      
      values.push(userId);
      await connection.execute(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      
      // Return updated user
      const [users] = await connection.execute(
        'SELECT id, email, role, status FROM users WHERE id = ?',
        [userId]
      );
      
      if (users.length > 0) {
        const user = users[0];
        return {
          id: user.id,
          email: user.email,
          userRole: user.role,
          active: user.status === 'active'
        };
      }
      
      return null;
    } finally {
      if (connection) connection.release();
    }
  }

  async deleteUser(userId) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      await connection.execute('DELETE FROM users WHERE id = ?', [userId]);
    } finally {
      if (connection) connection.release();
    }
  }
}