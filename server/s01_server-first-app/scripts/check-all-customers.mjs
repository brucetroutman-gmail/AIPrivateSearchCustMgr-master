import { getDB, initializeLicensingDB } from '../lib/licensing-db.mjs';

async function checkAllCustomers() {
  try {
    await initializeLicensingDB();
    const db = getDB();
    
    const [customers] = await db.execute(
      'SELECT id, email, email_verified, verification_code FROM customers ORDER BY created_at DESC LIMIT 5'
    );
    
    console.log(`📊 Found ${customers.length} customers:`);
    customers.forEach(customer => {
      console.log(`- ${customer.email} (verified: ${customer.email_verified ? 'Yes' : 'No'}) ${customer.verification_code ? `[Code: ${customer.verification_code}]` : ''}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAllCustomers();