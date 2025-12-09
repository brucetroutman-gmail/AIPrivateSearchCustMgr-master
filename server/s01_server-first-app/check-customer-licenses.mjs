import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '/Users/Shared/AIPrivateSearch/.env-custmgr' });

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: 'aiprivatesearch'
});

console.log('Checking for licenses table with tier column...\n');

const [tables] = await connection.execute("SHOW TABLES LIKE 'licenses'");
console.log('Tables found:', tables);

const [columns] = await connection.execute('DESCRIBE licenses');
console.log('\nLicenses table columns:');
columns.forEach(col => {
  console.log(`  ${col.Field}: ${col.Type}`);
});

const hasTier = columns.some(col => col.Field === 'tier');
const hasStatus = columns.some(col => col.Field === 'status');
const hasTrialStarted = columns.some(col => col.Field === 'trial_started_at');

console.log('\nColumn check:');
console.log('  tier:', hasTier ? '✓' : '✗');
console.log('  status:', hasStatus ? '✓' : '✗');
console.log('  trial_started_at:', hasTrialStarted ? '✓' : '✗');

await connection.end();
