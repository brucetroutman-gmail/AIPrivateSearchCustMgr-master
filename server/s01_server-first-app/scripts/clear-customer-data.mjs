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

async function clearCustomerData() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Clearing customer and device data...');
    
    // Clear in order due to foreign key constraints
    await connection.execute('DELETE FROM devices');
    console.log('✓ Cleared devices table');
    
    await connection.execute('DELETE FROM payments');
    console.log('✓ Cleared payments table');
    
    await connection.execute('DELETE FROM activation_attempts');
    console.log('✓ Cleared activation_attempts table');
    
    await connection.execute('DELETE FROM revocation_list');
    console.log('✓ Cleared revocation_list table');
    
    await connection.execute('DELETE FROM customers');
    console.log('✓ Cleared customers table');
    
    // Clear customer sessions but keep admin sessions
    await connection.execute("DELETE FROM sessions WHERE user_type = 'customer'");
    console.log('✓ Cleared customer sessions');
    
    console.log('\n✅ All customer and device data cleared successfully!');
    console.log('You can now relicense the aiprivatesearch app with fresh data.');
    
  } catch (error) {
    console.error('❌ Error clearing data:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

clearCustomerData();