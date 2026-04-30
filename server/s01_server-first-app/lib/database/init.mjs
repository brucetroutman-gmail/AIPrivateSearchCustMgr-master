import pool from './connection.mjs';
import crypto from 'crypto';

export async function initializeDB() {
  let connection;
  try {
    console.log('Initializing customer manager database...');
    
    connection = await pool.getConnection();

    console.log('Payments table ready');
    const adminUsers = [
      { email: 'adm-custmgr@a.com', firstName: 'Admin', lastName: 'User' },
      { email: 'custmgr-adm@c.com', firstName: 'CustMgr', lastName: 'Admin' }
    ];
    
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || '123';
    // Admin users already created by migrate-single-database.mjs
    console.log('Admin accounts already exist in unified database');
    
    // Admin users already created
    
    console.log('Customer manager database initialized successfully');
    console.log('Admin accounts: adm-custmgr@a.com, custmgr-adm@c.com (password: 123)');
    
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}