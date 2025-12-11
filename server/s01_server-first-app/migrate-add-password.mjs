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

async function addPasswordFields() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('Adding password fields to customers table...');
    
    // Add password and role fields
    await connection.execute(`
      ALTER TABLE customers 
      ADD COLUMN password_hash VARCHAR(255) NULL,
      ADD COLUMN role ENUM('customer') DEFAULT 'customer',
      ADD COLUMN active BOOLEAN DEFAULT TRUE,
      ADD COLUMN reset_token VARCHAR(64) NULL,
      ADD COLUMN reset_expires TIMESTAMP NULL
    `);
    
    console.log('✅ Password fields added successfully');
    
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ Password fields already exist');
    } else {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  } finally {
    await connection.end();
  }
}

addPasswordFields().catch(console.error);