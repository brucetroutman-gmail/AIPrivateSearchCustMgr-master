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

async function fixUsersTable() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('Adding missing active column to users table...');
    
    // Add active column if it doesn't exist
    try {
      await connection.execute(`ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT TRUE`);
      console.log('Active column added');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('Active column already exists');
      } else {
        throw error;
      }
    }
    
    console.log('✅ Users table fixed successfully');
    
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ Active column already exists');
    } else {
      console.error('❌ Fix failed:', error.message);
      throw error;
    }
  } finally {
    await connection.end();
  }
}

fixUsersTable().catch(console.error);