import { getDB, initializeLicensingDB } from '../lib/licensing-db.mjs';

async function debugQuery() {
  try {
    await initializeLicensingDB();
    const db = getDB();
    
    console.log('🔍 Testing licensing service query...\n');
    
    const [customers] = await db.execute(
      'SELECT id, tier, license_status, expires_at FROM customers WHERE email = ? AND email_verified = TRUE',
      ['bruce.troutman@gmail.com']
    );
    
    console.log('Query result:', customers);
    
    if (customers.length === 0) {
      console.log('\n❌ No customer found with this query');
      
      // Check what we actually have
      const [allCustomers] = await db.execute(
        'SELECT id, email, email_verified FROM customers WHERE email = ?',
        ['bruce.troutman@gmail.com']
      );
      
      console.log('Customer data:', allCustomers);
    } else {
      console.log('\n✅ Customer found successfully');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugQuery();