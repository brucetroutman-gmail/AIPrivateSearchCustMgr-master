import pool from './lib/database/connection.mjs';

async function debugConnection() {
  const connection = await pool.getConnection();
  
  try {
    // Check which database we're connected to
    const [dbResult] = await connection.execute('SELECT DATABASE() as current_db');
    console.log('Current database:', dbResult[0].current_db);
    
    // Check if users table exists and its structure
    const [tables] = await connection.execute("SHOW TABLES LIKE 'users'");
    console.log('Users table exists:', tables.length > 0);
    
    if (tables.length > 0) {
      const [columns] = await connection.execute('DESCRIBE users');
      console.log('Users table columns:');
      columns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type}`);
      });
      
      // Try the exact query that's failing
      try {
        const [users] = await connection.execute(
          'SELECT id, email, password_hash, role, active FROM users WHERE email = ?',
          ['adm-custmgr@a.com']
        );
        console.log('Query successful, found users:', users.length);
      } catch (error) {
        console.error('Query failed:', error.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    connection.release();
    process.exit(0);
  }
}

debugConnection();