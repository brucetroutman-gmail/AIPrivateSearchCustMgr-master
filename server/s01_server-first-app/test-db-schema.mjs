import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '/Users/Shared/AIPrivateSearch/.env-custmgr' });

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: 'aiprivatesearch'
});

console.log('Checking licenses table schema...\n');

const [columns] = await connection.execute('DESCRIBE licenses');
console.log('Columns in licenses table:');
columns.forEach(col => {
  console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
});

await connection.end();
