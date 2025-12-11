import bcrypt from 'bcrypt';
import pool from './lib/database/connection.mjs';

async function testAdminLogin() {
  const connection = await pool.getConnection();
  
  try {
    console.log('Testing admin login for adm-custmgr@a.com...');
    
    // Check if user exists
    const [users] = await connection.execute(
      'SELECT id, email, password_hash, role, active FROM users WHERE email = ?',
      ['adm-custmgr@a.com']
    );
    
    console.log('Query result:', users);
    
    if (users.length === 0) {
      console.log('❌ User not found in database');
      return;
    }
    
    const user = users[0];
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      active: user.active,
      hasPasswordHash: !!user.password_hash
    });
    
    // Test password
    const testPassword = '123';
    const validPassword = await bcrypt.compare(testPassword, user.password_hash);
    console.log(`Password validation for "${testPassword}":`, validPassword ? '✅ Valid' : '❌ Invalid');
    
    // Test if password hash looks correct
    console.log('Password hash starts with:', user.password_hash.substring(0, 10));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    connection.release();
    process.exit(0);
  }
}

testAdminLogin();