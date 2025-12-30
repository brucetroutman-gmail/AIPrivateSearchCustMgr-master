import { getDB, initializeLicensingDB } from '../lib/licensing-db.mjs';

async function verifyDevices() {
  try {
    await initializeLicensingDB();
    const db = getDB();
    
    console.log('📱 Checking registered devices...\n');
    
    const [devices] = await db.execute(`
      SELECT d.customer_id, d.device_id, d.hw_hash, d.status, d.first_seen, c.email
      FROM devices d
      JOIN customers c ON c.id = d.customer_id 
      WHERE c.email = ?
      ORDER BY d.first_seen
    `, ['bruce.troutman@gmail.com']);
    
    console.log(`Found ${devices.length} devices:`);
    devices.forEach((device, index) => {
      console.log(`${index + 1}. Device ID: ${device.device_id}`);
      console.log(`   HW Hash: ${device.hw_hash.substring(0, 16)}...`);
      console.log(`   Status: ${device.status}`);
      console.log(`   First Seen: ${device.first_seen}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyDevices();