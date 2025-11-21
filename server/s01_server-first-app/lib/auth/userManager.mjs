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
      await connection.changeUser({ database: 'aiprivatesearchcustmgr' });
      
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
      await connection.changeUser({ database: 'aiprivatesearchcustmgr' });
      
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
      await connection.changeUser({ database: 'aiprivatesearchcustmgr' });
      
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
      await connection.changeUser({ database: 'aiprivatesearchcustmgr' });
      
      await connection.execute(
        'DELETE FROM sessions WHERE session_token = ?',
        [sessionId]
      );
    } finally {
      if (connection) connection.release();
    }
  }
}