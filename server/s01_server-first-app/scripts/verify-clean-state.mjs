import { getDB, initializeLicensingDB } from '../lib/licensing-db.mjs';

async function verifyCleanState() {
  try {
    await initializeLicensingDB();
    const db = getDB();
    
    console.log('🔍 Verifying clean database state...\n');
    
    // Check customers
    const [customers] = await db.execute('SELECT COUNT(*) as count FROM customers');
    console.log(`📊 Customers: ${customers[0].count}`);
    
    // Check devices
    const [devices] = await db.execute('SELECT COUNT(*) as count FROM devices');
    console.log(`📱 Devices: ${devices[0].count}`);
    
    // Check activation attempts
    const [attempts] = await db.execute('SELECT COUNT(*) as count FROM activation_attempts');
    console.log(`🔄 Activation attempts: ${attempts[0].count}`);
    
    console.log('\n✅ Database state verified');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyCleanState();