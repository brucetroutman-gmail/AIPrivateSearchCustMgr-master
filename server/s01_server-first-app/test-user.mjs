import { UserManager } from './lib/auth/userManager.mjs';
import crypto from 'crypto';

const userManager = new UserManager();

console.log('Testing user authentication...');
console.log('Expected password hash for "123":', crypto.createHash('sha256').update('123').digest('hex'));

try {
  const user = await userManager.authenticateUser('adm-custmgr@a.com', '123');
  console.log('✅ Login successful:', user);
} catch (error) {
  console.log('❌ Login failed:', error.message);
}

process.exit(0);