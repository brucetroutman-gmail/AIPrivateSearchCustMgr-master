import express from 'express';
import { body, validationResult } from 'express-validator';
import { LicensingService } from '../lib/licensing-service.mjs';
import { initializeLicensingDB, getDB } from '../lib/licensing-db.mjs';

const router = express.Router();

let dbInitialized = false;
const ensureDBInitialized = async () => {
  if (!dbInitialized) {
    await initializeLicensingDB();
    dbInitialized = true;
  }
};

const validateDeviceRegistration = [
  body('email').isEmail(),
  body('deviceUuid').isLength({ min: 10, max: 64 }).trim(),
  body('deviceName').optional().isLength({ max: 255 }).trim(),
  body('pcCode').optional().isLength({ max: 10 }).trim(),
  body('ipAddress').optional().isLength({ max: 45 }).trim()
];

const validateDeviceValidation = [
  body('email').isEmail(),
  body('deviceUuid').isLength({ min: 10, max: 64 }).trim()
];

// GET /check-limits - Check customer limits before activation
router.get('/check-limits', async (req, res) => {
  try {
    await ensureDBInitialized();
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    const result = await LicensingService.checkCustomerLimits(email);
    res.json(result);
  } catch (error) {
    console.error('Check limits error:', error);
    res.status(500).json({ error: 'Failed to check limits' });
  }
});

// POST /register-device - Device registration
router.post('/register-device', validateDeviceRegistration, async (req, res) => {
  try {
    await ensureDBInitialized();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { email, deviceUuid, deviceName, pcCode, ipAddress } = req.body;
    const db = getDB();

    const [customers] = await db.execute(
      'SELECT id, email, tier, license_status FROM customers WHERE email = ? AND email_verified = 1',
      [email]
    );

    if (!customers.length) {
      return res.status(400).json({ success: false, error: 'Customer not found or email not verified' });
    }

    const customer = customers[0];

    const [existingDevices] = await db.execute(
      'SELECT id, device_name, status FROM devices WHERE customer_id = ? AND device_uuid = ?',
      [customer.id, deviceUuid]
    );

    if (existingDevices.length) {
      await db.execute(
        'UPDATE devices SET device_name = ?, last_seen = NOW(), status = "active", pc_code = ?, ip_address = ? WHERE id = ?',
        [deviceName || existingDevices[0].device_name, pcCode, ipAddress, existingDevices[0].id]
      );
    } else {
      await db.execute(
        'INSERT INTO devices (customer_id, device_uuid, device_name, pc_code, ip_address, registered_at, last_seen) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [customer.id, deviceUuid, deviceName || 'Unknown Device', pcCode, ipAddress]
      );
    }

    res.json({
      success: true,
      customer: {
        email: customer.email,
        tier: customer.tier || 1,
        license_status: customer.license_status
      },
      device: {
        uuid: deviceUuid,
        name: deviceName || 'Unknown Device',
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Device registration error:', error.message, error.code, error.sqlMessage);
    res.status(500).json({ success: false, error: `Registration failed: ${error.sqlMessage || error.message}` });
  }
});

// POST /validate-device - Device validation
router.post('/validate-device', validateDeviceValidation, async (req, res) => {
  try {
    await ensureDBInitialized();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { email, deviceUuid } = req.body;
    const db = getDB();

    const [customers] = await db.execute(
      'SELECT id, email, tier, license_status, expires_at FROM customers WHERE email = ? AND email_verified = 1',
      [email]
    );

    if (!customers.length) {
      return res.json({ valid: false, reason: 'Customer not found or email not verified' });
    }

    const customer = customers[0];

    if (customer.license_status !== 'trial' && customer.license_status !== 'active') {
      return res.json({ valid: false, reason: 'License not active' });
    }

    if (customer.expires_at && new Date() > new Date(customer.expires_at)) {
      return res.json({ valid: false, reason: 'License expired' });
    }

    const [devices] = await db.execute(
      'SELECT id, device_name, registered_at FROM devices WHERE customer_id = ? AND device_uuid = ? AND status = "active"',
      [customer.id, deviceUuid]
    );

    if (!devices.length) {
      return res.json({ valid: false, reason: 'Device not registered' });
    }

    const device = devices[0];
    await db.execute('UPDATE devices SET last_seen = NOW() WHERE id = ?', [device.id]);

    res.json({
      valid: true,
      customer: {
        email: customer.email,
        tier: customer.tier || 1,
        license_status: customer.license_status,
        expires_at: customer.expires_at
      },
      device: {
        uuid: deviceUuid,
        name: device.device_name,
        registered_at: device.registered_at
      }
    });

  } catch (error) {
    console.error('Device validation error:', error);
    res.status(500).json({ valid: false, reason: 'Server error' });
  }
});

// GET /status - Service health check
router.get('/status', async (req, res) => {
  try {
    await ensureDBInitialized();
    const db = getDB();
    const [result] = await db.execute('SELECT COUNT(*) as count FROM customers');

    res.json({
      service: 'AIPrivateSearch Licensing',
      status: 'active',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        customerCount: result[0].count
      }
    });
  } catch (error) {
    res.json({
      service: 'AIPrivateSearch Licensing',
      status: 'error',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error.message
      }
    });
  }
});

export default router;
