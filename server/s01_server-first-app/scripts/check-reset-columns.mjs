import pool from '../lib/database/connection.mjs';

const conn = await pool.getConnection();
const [cols] = await conn.execute('DESCRIBE customers');
conn.release();

const resetCols = cols.filter(c => c.Field.includes('reset'));
console.log('Reset columns:', resetCols.length > 0 ? resetCols.map(c => `${c.Field} ${c.Type}`).join(', ') : 'NONE FOUND');

process.exit(0);
