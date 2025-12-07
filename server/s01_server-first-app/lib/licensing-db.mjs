import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '/Users/Shared/AIPrivateSearch/.env' });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'aiprivatesearch'
};

let pool;

export async function initializeLicensingDB() {
  try {
    pool = mysql.createPool(dbConfig);
    
    // Create licensing tables
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        subscription_tier TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS licenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        hw_hash VARCHAR(64) NOT NULL,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        revoked BOOLEAN DEFAULT FALSE,
        app_version VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        UNIQUE KEY unique_customer_hw (customer_id, hw_hash),
        INDEX idx_hw_hash (hw_hash),
        INDEX idx_expires (expires_at)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS revocation_list (
        token_hash VARCHAR(64) PRIMARY KEY,
        revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reason VARCHAR(255)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS activation_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255),
        hw_hash VARCHAR(64),
        ip_address VARCHAR(45),
        attempts INT DEFAULT 1,
        last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN DEFAULT FALSE,
        UNIQUE KEY unique_email_hw_ip (email, hw_hash, ip_address),
        INDEX idx_last_attempt (last_attempt)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS devices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        device_id VARCHAR(255) UNIQUE NOT NULL,
        hw_hash VARCHAR(64) NOT NULL,
        device_name VARCHAR(255),
        device_info JSON,
        first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        status ENUM('active', 'inactive', 'revoked') DEFAULT 'active',
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        INDEX idx_customer_devices (customer_id, status),
        INDEX idx_hw_hash (hw_hash)
      )
    `);

    console.log('Licensing database tables initialized successfully');
    return pool;
  } catch (error) {
    console.error('Failed to initialize licensing database:', error);
    throw error;
  }
}

export function getDB() {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeLicensingDB() first.');
  }
  return pool;
}