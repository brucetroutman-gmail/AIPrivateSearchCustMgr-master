import pool from './connection.mjs';

export async function initializeDB() {
  let connection;
  try {
    console.log('Initializing customer manager database...');
    connection = await pool.getConnection();
    console.log('Customer manager database initialized successfully');
    console.log('Admin accounts: adm-custmgr@a.com, custmgr-adm@c.com (password: 123)');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}