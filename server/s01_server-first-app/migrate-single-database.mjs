import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
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

async function consolidateToSingleDatabase() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('Consolidating to single database (aiprivatesearch)...');
    
    // Already connected to aiprivatesearch database
    
    // Create admin users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'manager') NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role),
        INDEX idx_active (active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    
    // Create unified sessions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(128) PRIMARY KEY,
        user_id INT NOT NULL,
        user_type ENUM('admin', 'customer') NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id, user_type),
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    
    // Create admin accounts
    const adminPassword = await bcrypt.hash('123', 12);
    
    await connection.execute(`
      INSERT IGNORE INTO users (email, password_hash, role, active) VALUES 
      ('adm-custmgr@a.com', ?, 'admin', 1),
      ('custmgr-adm@c.com', ?, 'admin', 1)
    `, [adminPassword, adminPassword]);
    
    console.log('✅ Admin users created in aiprivatesearch database');
    
    // Update customers table to be compatible with unified auth
    await connection.execute(`
      ALTER TABLE customers 
      MODIFY COLUMN role ENUM('customer') DEFAULT 'customer'
    `);
    
    console.log('✅ Single database consolidation completed');
    console.log('📋 Database structure:');
    console.log('   - users (admin accounts)');
    console.log('   - customers (customer accounts)');
    console.log('   - sessions (unified sessions)');
    console.log('   - licenses, devices, payments (business data)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

consolidateToSingleDatabase().catch(console.error);