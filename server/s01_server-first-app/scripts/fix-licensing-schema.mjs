#!/usr/bin/env node

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Try multiple .env-custmgr locations
const envPaths = [
  '/Users/Shared/AIPrivateSearch/.env-custmgr',  // macOS
  '/webs/AIPrivateSearch/.env-custmgr',          // Ubuntu
  '.env'                                         // Local fallback
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
  database: process.env.DB_DATABASE || 'aiprivatesearch'
};

async function fixLicensingSchema() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    console.log('🔧 Fixing licensing database schema...');
    
    // Drop old licenses table if it exists
    await connection.execute('DROP TABLE IF EXISTS licenses');
    console.log('✓ Dropped old licenses table');
    
    // Ensure customers table has correct integrated schema
    await connection.execute(`
      ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS tier TINYINT NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS license_status ENUM('trial', 'active', 'expired', 'suspended', 'cancelled') DEFAULT 'trial',
      ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS grace_period_ends TIMESTAMP NULL
    `);
    console.log('✓ Updated customers table with integrated license fields');
    
    // Ensure devices table exists with correct schema
    await connection.execute(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ Ensured devices table exists');
    
    console.log('\n✅ Licensing schema fixed successfully!');
    console.log('The system now uses integrated license fields in the customers table.');
    
  } catch (error) {
    console.error('❌ Error fixing schema:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixLicensingSchema();