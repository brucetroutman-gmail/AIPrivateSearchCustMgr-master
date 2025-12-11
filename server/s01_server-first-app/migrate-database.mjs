import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment
const envPaths = [
  '/Users/Shared/AIPrivateSearch/.env-custmgr',
  '/webs/AIPrivateSearch/.env-custmgr',
  '.env'
];

for (const envPath of envPaths) {
  try {
    dotenv.config({ path: envPath });
    if (process.env.DB_HOST) break;
  } catch (e) {}
}

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'aiprivatesearch'
};

async function migrateDatabase() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('Starting database migration...');
    
    // Drop existing tables in correct order (foreign keys first)
    await connection.execute('DROP TABLE IF EXISTS devices');
    await connection.execute('DROP TABLE IF EXISTS payments');
    await connection.execute('DROP TABLE IF EXISTS revocation_list');
    await connection.execute('DROP TABLE IF EXISTS activation_attempts');
    await connection.execute('DROP TABLE IF EXISTS licenses');
    await connection.execute('DROP TABLE IF EXISTS customers');
    
    console.log('Dropped existing tables');
    
    // Create customers table
    await connection.execute(`
      CREATE TABLE customers (
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
    
    // Create licenses table
    await connection.execute(`
      CREATE TABLE licenses (
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
    
    // Create other tables
    await connection.execute(`
      CREATE TABLE payments (
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
    
    await connection.execute(`
      CREATE TABLE devices (
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
    
    await connection.execute(`
      CREATE TABLE revocation_list (
        token_hash VARCHAR(64) PRIMARY KEY,
        customer_id INT,
        revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reason VARCHAR(255),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        INDEX idx_revoked_at (revoked_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    
    await connection.execute(`
      CREATE TABLE activation_attempts (
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
    
    console.log('✅ Database migration completed successfully');
    console.log('All tables created with optimal schema');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

migrateDatabase().catch(console.error);