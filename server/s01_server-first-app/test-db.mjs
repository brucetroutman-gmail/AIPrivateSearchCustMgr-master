import { initializeDB } from './lib/database/init.mjs';

console.log('Testing database initialization...');
initializeDB().then(() => {
  console.log('Database initialization complete');
  process.exit(0);
}).catch(error => {
  console.error('Database initialization failed:', error);
  process.exit(1);
});