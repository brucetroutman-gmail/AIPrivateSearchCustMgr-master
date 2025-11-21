import pool from './lib/database/connection.mjs';
import crypto from 'crypto';

async function createAdmin() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.changeUser({ database: 'aiprivatesearchcustmgr' });
    
    // Delete existing user if exists
    await connection.execute('DELETE FROM users WHERE email = ?', ['adm-custmgr@a.com']);
    
    // Create admin user
    const passwordHash = crypto.createHash('sha256').update('123').digest('hex');
    await connection.execute(
      'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)',
      ['adm-custmgr@a.com', passwordHash, 'Admin', 'User', 'admin']
    );
    
    console.log('✅ Admin user created successfully');
    console.log('Email: adm-custmgr@a.com');
    console.log('Password: 123');
    console.log('Hash:', passwordHash);
    
    // Verify user exists
    const [users] = await connection.execute('SELECT * FROM users WHERE email = ?', ['adm-custmgr@a.com']);
    console.log('User in database:', users[0]);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

createAdmin();