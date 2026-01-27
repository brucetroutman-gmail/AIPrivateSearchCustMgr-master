import pool from '../lib/database/connection.mjs';

const token = process.argv[2];

if (!token) {
  console.log('Usage: node check-token.mjs <token>');
  process.exit(1);
}

const conn = await pool.getConnection();
const [rows] = await conn.execute(
  'SELECT id, email, reset_token, reset_expires, NOW() as current_time FROM customers WHERE reset_token = ?',
  [token]
);
conn.release();

if (rows.length === 0) {
  console.log('❌ No customer found with this token');
  
  // Check if any tokens exist
  const [allTokens] = await pool.getConnection().then(async c => {
    const result = await c.execute('SELECT email, reset_token, reset_expires FROM customers WHERE reset_token IS NOT NULL');
    c.release();
    return result;
  });
  
  console.log(`\nFound ${allTokens.length} customers with reset tokens:`);
  allTokens.forEach(t => {
    console.log(`  - ${t.email}: token=${t.reset_token.substring(0, 10)}..., expires=${t.reset_expires}`);
  });
} else {
  const customer = rows[0];
  const isExpired = new Date(customer.reset_expires) < new Date(customer.current_time);
  
  console.log('✅ Token found!');
  console.log(`  Email: ${customer.email}`);
  console.log(`  Token: ${customer.reset_token}`);
  console.log(`  Expires: ${customer.reset_expires}`);
  console.log(`  Current: ${customer.current_time}`);
  console.log(`  Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
}

process.exit(0);
