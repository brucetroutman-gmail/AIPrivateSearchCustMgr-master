#!/usr/bin/env node

import { initializeLicensingDB, getDB } from '../lib/licensing-db.mjs';

async function testLicensingDB() {
  try {
    console.log('Initializing LicensingService database...');
    await initializeLicensingDB();
    console.log('✅ Database initialized');
    
    console.log('Testing LicensingService database connection...');
    
    const db = getDB();
    
    // Test the exact query used in LicensingService
    const [customers] = await db.execute(
      'SELECT id, tier, license_status, expires_at FROM customers WHERE email = ? AND email_verified = TRUE',
      ['bruce.troutman@gmail.com']
    );
    
    console.log('Query result:', customers);
    
    if (customers.length === 0) {
      console.log('❌ No customer found with that email and email_verified = TRUE');
    } else {
      console.log('✅ Customer found:', customers[0]);
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }
  
  process.exit(0);
}

testLicensingDB();