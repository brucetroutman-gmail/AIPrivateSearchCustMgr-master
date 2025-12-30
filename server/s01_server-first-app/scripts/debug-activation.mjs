#!/usr/bin/env node

import { initializeLicensingDB, getDB } from '../lib/licensing-db.mjs';
import { LicensingService } from '../lib/licensing-service.mjs';

async function debugActivation() {
  try {
    console.log('🔍 Debug: Testing activation flow...');
    
    // Initialize database
    await initializeLicensingDB();
    console.log('✓ Database initialized');
    
    const db = getDB();
    
    // Test the exact query from LicensingService
    console.log('\n1. Testing customer lookup query...');
    const [customers] = await db.execute(
      'SELECT id, tier, license_status, expires_at FROM customers WHERE email = ? AND email_verified = TRUE',
      ['bruce.troutman@gmail.com']
    );
    
    console.log('Customer query result:', customers);
    
    if (customers.length === 0) {
      console.log('❌ No customer found - checking email_verified status...');
      
      const [allCustomers] = await db.execute(
        'SELECT id, email, email_verified, tier, license_status FROM customers WHERE email = ?',
        ['bruce.troutman@gmail.com']
      );
      
      console.log('All customer data:', allCustomers);
      return;
    }
    
    console.log('✓ Customer found, testing full activation...');
    
    // Test full activation
    const result = await LicensingService.activateLicense(
      'bruce.troutman@gmail.com',
      'MAC-DEVICE-001',
      '19.83',
      '127.0.0.1'
    );
    
    console.log('✅ Activation successful:', result);
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

debugActivation();