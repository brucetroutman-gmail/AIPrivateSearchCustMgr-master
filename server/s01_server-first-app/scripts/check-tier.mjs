import { getDB, initializeLicensingDB } from '../lib/licensing-db.mjs';

async function checkTier() {
  try {
    await initializeLicensingDB();
    const db = getDB();
    
    const [customers] = await db.execute(
      'SELECT email, tier FROM customers WHERE email = ?',
      ['bruce.troutman@gmail.com']
    );
    
    if (customers.length > 0) {
      console.log(`Customer tier: ${customers[0].tier}`);
      console.log(`Expected: 2 (Premium)`);
    } else {
      console.log('Customer not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTier();