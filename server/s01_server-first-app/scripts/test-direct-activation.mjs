import { LicensingService } from '../lib/licensing-service.mjs';
import { initializeLicensingDB } from '../lib/licensing-db.mjs';

async function testActivation() {
  try {
    console.log('Initializing database...');
    await initializeLicensingDB();
    
    console.log('Testing LicensingService.activateLicense for third device (should now succeed with Premium tier)...');
    const result = await LicensingService.activateLicense(
      'bruce.troutman@gmail.com',
      'MAC-DEVICE-003',
      '19.83',
      '127.0.0.1'
    );
    
    console.log('Third device activation result (Premium tier):', JSON.stringify(result, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Second device activation error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testActivation();