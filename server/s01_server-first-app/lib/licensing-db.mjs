import pool from './database/connection.mjs';

export async function initializeLicensingDB() {
  try {
    // Test connection using shared pool
    const connection = await pool.getConnection();
    connection.release();
    
    console.log('Licensing database connection established successfully (using shared pool)');
    return pool;
  } catch (error) {
    console.error('Failed to initialize licensing database:', error);
    throw error;
  }
}

export function getDB() {
  return pool;
}