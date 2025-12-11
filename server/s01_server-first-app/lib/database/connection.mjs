import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Try multiple .env-custmgr locations
const envPaths = [
  '/Users/Shared/AIPrivateSearch/.env-custmgr',  // macOS
  '/webs/AIPrivateSearch/.env-custmgr',          // Ubuntu
  '.env'                                         // Local fallback
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    console.log(`[DB] Trying to load: ${envPath}`);
    dotenv.config({ path: envPath });
    if (process.env.DB_HOST) {
      console.log(`[DB] Successfully loaded: ${envPath}`);
      envLoaded = true;
      break;
    }
  } catch (e) {
    console.log(`[DB] Failed to load: ${envPath}`, e.message);
  }
}

if (!envLoaded) {
  console.error('[DB] ERROR: No .env-custmgr file found! DB_HOST not set.');
}

console.log('[DB] Environment variables:', {
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_USERNAME: process.env.DB_USERNAME,
  DB_DATABASE: process.env.DB_DATABASE,
  hasPassword: !!process.env.DB_PASSWORD
});

if (!process.env.DB_HOST || !process.env.DB_USERNAME) {
  throw new Error('[DB] FATAL: Required database credentials not found in .env-custmgr');
}

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

console.log('[DB] Connection config:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database,
  hasPassword: !!dbConfig.password
});

const pool = mysql.createPool(dbConfig);

export default pool;