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
    
    // Create customers table for customer registration
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        city VARCHAR(100),
        state VARCHAR(100),
        postal_code VARCHAR(20),
        customer_code VARCHAR(64) UNIQUE NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        verification_code VARCHAR(10),
        verification_expires TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_customer_code (customer_code),
        INDEX idx_email_verified (email_verified)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS licenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        tier TINYINT NOT NULL DEFAULT 1,
        status ENUM('trial', 'active', 'expired', 'suspended', 'cancelled') DEFAULT 'trial',
        trial_started_at TIMESTAMP NULL,
        expires_at TIMESTAMP NOT NULL,
        grace_period_ends TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        INDEX idx_customer (customer_id),
        INDEX idx_status (status),
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        license_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        payment_method VARCHAR(50) DEFAULT 'paypal',
        paypal_order_id VARCHAR(255),
        paypal_payer_id VARCHAR(255),
        paypal_subscription_id VARCHAR(255),
        status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
        tier TINYINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE,
        INDEX idx_customer_payments (customer_id),
        INDEX idx_status (status),
        INDEX idx_paypal_order (paypal_order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS revocation_list (
        token_hash VARCHAR(64) PRIMARY KEY,
        customer_id INT,
        revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reason VARCHAR(255),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        INDEX idx_revoked_at (revoked_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
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
        INDEX idx_last_attempt (last_attempt),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS devices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        license_id INT NOT NULL,
        device_id VARCHAR(255) UNIQUE NOT NULL,
        hw_hash VARCHAR(64) NOT NULL,
        device_name VARCHAR(255),
        device_info JSON,
        first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        status ENUM('active', 'inactive', 'revoked') DEFAULT 'active',
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE,
        INDEX idx_customer_devices (customer_id, status),
        INDEX idx_license_devices (license_id, status),
        INDEX idx_hw_hash (hw_hash)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
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