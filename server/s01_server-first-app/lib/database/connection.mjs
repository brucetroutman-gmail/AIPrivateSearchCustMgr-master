import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Try multiple .env locations
const envPaths = [
  '/Users/Shared/AIPrivateSearch/.env',  // macOS
  '/webs/AIPrivateSearch/.env',          // Ubuntu
  '.env'                                 // Local fallback
];

for (const envPath of envPaths) {
  try {
    dotenv.config({ path: envPath });
    if (process.env.DB_HOST) break;
  } catch (e) {}
}

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'aiprivatesearchcustmgr',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

export default pool;