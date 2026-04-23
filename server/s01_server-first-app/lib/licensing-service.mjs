import { getDB } from './licensing-db.mjs';
import { getTierName, getTierFeatures, getMaxDevices } from './tier-helpers.mjs';

export class LicensingService {

  static async checkCustomerLimits(email) {
    const db = getDB();

    try {
      const [customers] = await db.execute(
        'SELECT id, tier, created_at FROM customers WHERE email = ?',
        [email]
      );

      if (customers.length === 0) {
        return {
          exists: false,
          message: 'Customer not found. Please register first.'
        };
      }

      const customer = customers[0];
      const tier = customer.tier;
      const tierName = getTierName(tier);
      const maxDevices = getMaxDevices(tier);
      const features = getTierFeatures(tier);

      const currentDevices = await this.getDeviceCount(customer.id);

      const [deviceList] = await db.execute(
        'SELECT id, device_uuid, device_name, pc_code, ip_address, registered_at, last_seen FROM devices WHERE customer_id = ? AND status = "active" ORDER BY last_seen DESC',
        [customer.id]
      );

      return {
        exists: true,
        customerId: customer.id,
        tier,
        tierName,
        maxDevices,
        currentDevices,
        availableSlots: maxDevices - currentDevices,
        canActivate: currentDevices < maxDevices,
        features,
        devices: deviceList,
        message: currentDevices >= maxDevices
          ? `Device limit reached (${currentDevices}/${maxDevices}). ${tier < 3 ? `Upgrade to ${getTierName(tier + 1)} tier for more devices.` : 'Maximum tier reached.'}`
          : `${maxDevices - currentDevices} device slot(s) available.`
      };
    } catch (error) {
      throw new Error(`Failed to check customer limits: ${error.message}`);
    }
  }

  static async getDeviceCount(customerId) {
    const db = getDB();
    const [devices] = await db.execute(
      'SELECT COUNT(*) as count FROM devices WHERE customer_id = ? AND status = "active"',
      [customerId]
    );
    return devices[0].count;
  }
}
