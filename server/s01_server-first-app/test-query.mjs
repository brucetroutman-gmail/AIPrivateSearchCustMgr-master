import pool from './lib/database/connection.mjs';

async function testQuery() {
  const connection = await pool.getConnection();
  
  try {
    console.log('Testing exact query from UnifiedUserManager...');
    
    const [users] = await connection.execute(
      'SELECT id, email, password_hash, role, active FROM users WHERE email = ?',
      ['adm-custmgr@a.com']
    );
    
    console.log('Query successful:', users);
    
  } catch (error) {
    console.error('❌ Query error:', error.message);
    console.error('Full error:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

testQuery();