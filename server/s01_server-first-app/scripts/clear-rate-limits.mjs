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

async function clearRateLimits() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    console.log('🧹 Clearing rate limiting records...');
    
    const [result] = await connection.execute('DELETE FROM activation_attempts');
    console.log(`✓ Cleared ${result.affectedRows} activation attempt records`);
    
    console.log('\n✅ Rate limits cleared successfully!');
    console.log('You can now test device activation without rate limiting.');
    
  } catch (error) {
    console.error('❌ Error clearing rate limits:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

clearRateLimits();