import { LicensingService } from '../lib/licensing-service.mjs';
import { initializeLicensingDB } from '../lib/licensing-db.mjs';

async function testActivation() {
  try {
    console.log('Initializing database...');
    await initializeLicensingDB();
    
    console.log('Testing LicensingService.activateLicense directly...');
    const result = await LicensingService.activateLicense(
      'bruce.troutman@gmail.com',
      'MAC-DEVICE-001',
      '19.83',
      '127.0.0.1'
    );
    
    console.log('Direct activation result:', JSON.stringify(result, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Direct activation error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testActivation();