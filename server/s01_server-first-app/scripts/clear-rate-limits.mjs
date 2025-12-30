#!/usr/bin/env node

import pool from '../lib/database/connection.mjs';

async function clearRateLimits() {
  let connection;
  try {
    console.log('Clearing activation rate limits...');
    
    connection = await pool.getConnection();
    
    // Clear all activation attempts
    const [result] = await connection.execute('DELETE FROM activation_attempts');
    
    console.log(`✅ Cleared ${result.affectedRows} rate limit records`);
    console.log('Rate limits have been reset. You can now attempt license activation again.');
    
  } catch (error) {
    console.error('❌ Error clearing rate limits:', error.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

clearRateLimits();