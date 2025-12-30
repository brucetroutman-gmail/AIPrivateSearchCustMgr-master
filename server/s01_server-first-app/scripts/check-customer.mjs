import { getDB, initializeLicensingDB } from '../lib/licensing-db.mjs';

async function checkCustomer() {
  try {
    await initializeLicensingDB();
    const db = getDB();
    console.log('Database connection established');
    
    const [customers] = await db.execute(
      'SELECT id, email, email_verified, tier, license_status, trial_started_at, expires_at FROM customers WHERE email = ?',
      ['bruce.troutman@gmail.com']
    );
    
    console.log('Customer query result:', customers);
    
    if (customers.length === 0) {
      console.log('Customer not found');
    } else {
      const customer = customers[0];
      console.log('Customer found:');
      console.log('- ID:', customer.id);
      console.log('- Email:', customer.email);
      console.log('- Email Verified:', customer.email_verified);
      console.log('- Tier:', customer.tier);
      console.log('- License Status:', customer.license_status);
      console.log('- Trial Started:', customer.trial_started_at);
      console.log('- Expires At:', customer.expires_at);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCustomer();