import bcrypt from 'bcrypt';
import pool from './lib/database/connection.mjs';

async function createAdminUser() {
  const connection = await pool.getConnection();
  
  try {
    console.log('Creating admin user in aiprivatesearch database...');
    
    // Check current database
    const [dbResult] = await connection.execute('SELECT DATABASE() as current_db');
    console.log('Connected to database:', dbResult[0].current_db);
    
    // Check if user already exists
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      ['adm-custmgr@a.com']
    );
    
    if (existing.length > 0) {
      console.log('✅ Admin user already exists');
      return;
    }
    
    // Create password hash
    const passwordHash = await bcrypt.hash('123', 12);
    
    // Insert admin user
    await connection.execute(
      'INSERT INTO users (email, password_hash, role, active) VALUES (?, ?, ?, ?)',
      ['adm-custmgr@a.com', passwordHash, 'admin', 1]
    );
    
    console.log('✅ Admin user created successfully');
    
    // Also create second admin user
    const [existing2] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      ['custmgr-adm@c.com']
    );
    
    if (existing2.length === 0) {
      await connection.execute(
        'INSERT INTO users (email, password_hash, role, active) VALUES (?, ?, ?, ?)',
        ['custmgr-adm@c.com', passwordHash, 'admin', 1]
      );
      console.log('✅ Second admin user created successfully');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    connection.release();
    process.exit(0);
  }
}

createAdminUser();