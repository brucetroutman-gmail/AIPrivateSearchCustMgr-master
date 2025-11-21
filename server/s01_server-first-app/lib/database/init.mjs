import pool from './connection.mjs';
import crypto from 'crypto';

export async function initializeDB() {
  let connection;
  try {
    console.log('Initializing customer manager database...');
    
    connection = await pool.getConnection();
    
    // Create database if it doesn't exist
    await connection.query('CREATE DATABASE IF NOT EXISTS aiprivatesearchcustmgr');
    
    // Switch to the database
    await connection.changeUser({ database: 'aiprivatesearchcustmgr' });
    
    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role ENUM('admin', 'manager') DEFAULT 'manager',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        status ENUM('active', 'inactive', 'suspended') DEFAULT 'active'
      )
    `);
    
    // Create sessions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Check if admin user exists
    const [users] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      ['adm-custmgr@a.com']
    );
    
    // Create admin user if doesn't exist
    if (users.length === 0) {
      if (!process.env.ADMIN_DEFAULT_PASSWORD) {
        throw new Error('ADMIN_DEFAULT_PASSWORD environment variable is required');
      }
      const adminCredential = process.env.ADMIN_DEFAULT_PASSWORD;
      const credentialHash = crypto.createHash('sha256').update(adminCredential).digest('hex');
      await connection.execute(
        'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)',
        ['adm-custmgr@a.com', credentialHash, 'Admin', 'User', 'admin']
      );
      console.log('Default admin user created: adm-custmgr@a.com / 123');
    }
    
    console.log('Customer manager database initialized successfully');
    
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}