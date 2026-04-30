import pool from './connection.mjs';
import crypto from 'crypto';

export async function initializeDB() {
  let connection;
  try {
    console.log('Initializing customer manager database...');
    
    connection = await pool.getConnection();

    // Create payments table if not exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        stripe_session_id VARCHAR(255),
        stripe_payment_intent_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        amount INT NOT NULL,
        tier_purchased TINYINT NOT NULL,
        status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);
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