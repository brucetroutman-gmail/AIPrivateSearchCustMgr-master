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

async function deleteCustomer(email) {
  if (!email) {
    console.error('❌ Email address is required');
    console.log('Usage: node delete-customer.mjs <email>');
    process.exit(1);
  }

  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    console.log(`🗑️  Deleting customer: ${email}`);
    
    // Get customer ID first
    const [customers] = await connection.execute(
      'SELECT id FROM customers WHERE email = ?',
      [email]
    );
    
    if (customers.length === 0) {
      console.log(`ℹ️  No customer found with email: ${email}`);
      return;
    }
    
    const customerId = customers[0].id;
    console.log(`📋 Found customer ID: ${customerId}`);
    
    // Delete all child records first (foreign key constraints)
    const [devices] = await connection.execute(
      'DELETE FROM devices WHERE customer_id = ?',
      [customerId]
    );
    console.log(`✓ Deleted ${devices.affectedRows} devices`);
    
    const [payments] = await connection.execute(
      'DELETE FROM payments WHERE customer_id = ?',
      [customerId]
    );
    console.log(`✓ Deleted ${payments.affectedRows} payments`);
    
    const [attempts] = await connection.execute(
      'DELETE FROM activation_attempts WHERE email = ?',
      [email]
    );
    console.log(`✓ Deleted ${attempts.affectedRows} activation attempts`);
    
    const [revocations] = await connection.execute(
      'DELETE FROM revocation_list WHERE customer_id = ?',
      [customerId]
    );
    console.log(`✓ Deleted ${revocations.affectedRows} revoked tokens`);
    
    const [sessions] = await connection.execute(
      "DELETE FROM sessions WHERE user_type = 'customer' AND user_id = ?",
      [customerId]
    );
    console.log(`✓ Deleted ${sessions.affectedRows} customer sessions`);
    
    // Finally delete the customer record
    const [customer] = await connection.execute(
      'DELETE FROM customers WHERE id = ?',
      [customerId]
    );
    console.log(`✓ Deleted customer record`);
    
    console.log(`\n✅ Customer ${email} completely removed from system`);
    
  } catch (error) {
    console.error('❌ Error deleting customer:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Get email from command line argument
const email = process.argv[2];
deleteCustomer(email);