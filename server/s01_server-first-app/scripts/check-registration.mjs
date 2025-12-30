import { getDB, initializeLicensingDB } from '../lib/licensing-db.mjs';

async function checkRegistration() {
  try {
    await initializeLicensingDB();
    const db = getDB();
    
    const [customers] = await db.execute(
      'SELECT id, email, tier, license_status, customer_code, email_verified, trial_started_at, expires_at FROM customers WHERE email = ?',
      ['test@example.com']
    );
    
    if (customers.length === 0) {
      console.log('❌ Customer not found');
    } else {
      const customer = customers[0];
      console.log('✅ Customer found:');
      console.log('- ID:', customer.id);
      console.log('- Email:', customer.email);
      console.log('- Email Verified:', customer.email_verified ? 'Yes' : 'No');
      console.log('- Tier:', customer.tier);
      console.log('- License Status:', customer.license_status);
      console.log('- Customer Code:', customer.customer_code);
      console.log('- Trial Started:', customer.trial_started_at);
      console.log('- Expires At:', customer.expires_at);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkRegistration();