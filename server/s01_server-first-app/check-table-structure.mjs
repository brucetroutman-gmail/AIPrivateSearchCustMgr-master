import pool from './lib/database/connection.mjs';

async function checkTableStructure() {
  const connection = await pool.getConnection();
  
  try {
    console.log('Checking users table structure...');
    
    const [columns] = await connection.execute('DESCRIBE users');
    console.log('Users table columns:');
    columns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null} ${col.Key} ${col.Default}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    connection.release();
    process.exit(0);
  }
}

checkTableStructure();