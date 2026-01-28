import express from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { LicensingService } from '../lib/licensing-service.mjs';
import { getPublicKey } from '../lib/jwt-manager.mjs';
import { initializeLicensingDB, getDB } from '../lib/licensing-db.mjs';

const router = express.Router();

// Initialize licensing database connection
let dbInitialized = false;
const ensureDBInitialized = async () => {
  if (!dbInitialized) {
    await initializeLicensingDB();
    dbInitialized = true;
  }
};

// Rate limiting for activation endpoint
const activationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many activation attempts. Please wait 5 minutes before trying again, or contact support to reset your rate limit.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation middleware
const validateActivation = [
  body('email').isEmail(), // Keep without normalizeEmail() to preserve Gmail dots
  body('hwId').isLength({ min: 10, max: 100 }).trim(),
  body('appVersion').optional().isLength({ max: 20 }).trim(),
  body('appId').optional().isLength({ max: 50 }).trim()
];

const validateRefresh = [
  body('token').notEmpty().trim()
];

const validateRefreshToken = [
  body('refreshToken').notEmpty().trim()
];

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

// POST /activate - Initial license activation
router.post('/activate', activationLimiter, validateActivation, async (req, res) => {
  try {
    await ensureDBInitialized();
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { email, hwId, appVersion = '19.61' } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await LicensingService.activateLicense(email, hwId, appVersion, ipAddress);
    
    res.json({
      success: true,
      token: result.token,
      refreshToken: result.refreshToken,
      tier: result.tier,
      features: result.features,
      deviceLimit: result.deviceLimit,
      devicesUsed: result.devicesUsed,
      existing: result.existing,
      message: result.existing ? 'License already exists' : 'License activated successfully'
    });

  } catch (error) {
    console.error('Activation error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /refresh - Token refresh
router.post('/refresh', validateRefreshToken, async (req, res) => {
  try {
    await ensureDBInitialized();
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { refreshToken } = req.body;
    const result = await LicensingService.refreshLicense(refreshToken);
    
    res.json({
      success: true,
      token: result.token,
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    console.error('Refresh error:', error);
    res.status(401).json({ success: false, error: error.message });
  }
});

// POST /validate - License validation
router.post('/validate', validateRefresh, async (req, res) => {
  try {
    await ensureDBInitialized();
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { token } = req.body;
    const result = await LicensingService.validateLicense(token);
    
    if (result.valid) {
      const payload = result.payload;
      res.json({
        valid: true,
        email: payload.email,
        tier: payload.tier,
        features: payload.features || [],
        deviceLimit: payload.deviceLimit || 0,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        message: 'License is valid'
      });
    } else {
      res.status(401).json({
        valid: false,
        reason: result.reason
      });
    }

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

// POST /revoke - Admin license revocation
router.post('/revoke', validateRefresh, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { token, reason } = req.body;
    const result = await LicensingService.revokeLicense(token, reason);
    
    res.json({
      success: result.success,
      message: 'License revoked successfully'
    });

  } catch (error) {
    console.error('Revocation error:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /public-key - Get public key for local validation
router.get('/public-key', (req, res) => {
  try {
    res.json({
      publicKey: getPublicKey(),
      algorithm: 'RS256'
    });
  } catch (error) {
    console.error('Public key error:', error);
    res.status(500).json({ error: 'Failed to retrieve public key' });
  }
});

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

// POST /register-device - Device registration without JWT
router.post('/register-device', validateDeviceRegistration, async (req, res) => {
  try {
    await ensureDBInitialized();
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { email, deviceUuid, deviceName, pcCode, ipAddress } = req.body;
    console.log('🔐 CUSTMGR: Saving pcCode:', pcCode, 'ipAddress:', ipAddress);
    
    if (!pcCode || !ipAddress) {
      console.log('🔐 CUSTMGR: WARNING - Missing data: pcCode=', pcCode, 'ipAddress=', ipAddress);
    }
    const db = getDB();
    
    // Find customer by email
    const [customers] = await db.execute(
      'SELECT id, email, tier, license_status FROM customers WHERE email = ? AND email_verified = 1',
      [email]
    );
    
    if (!customers.length) {
      return res.status(400).json({ success: false, error: 'Customer not found or email not verified' });
    }
    
    const customer = customers[0];
    
    // Check if device already registered
    const [existingDevices] = await db.execute(
      'SELECT id, device_name, status FROM devices WHERE customer_id = ? AND device_uuid = ?',
      [customer.id, deviceUuid]
    );
    
    if (existingDevices.length) {
      // Update existing device with new fields
      await db.execute(
        'UPDATE devices SET device_name = ?, last_seen = NOW(), status = "active", pc_code = ?, ip_address = ? WHERE id = ?',
        [deviceName || existingDevices[0].device_name, pcCode, ipAddress, existingDevices[0].id]
      );
    } else {
      // Register new device with all fields
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
    console.error('Device registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// POST /validate-device - Device validation without JWT
router.post('/validate-device', validateDeviceValidation, async (req, res) => {
  try {
    await ensureDBInitialized();
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { email, deviceUuid } = req.body;
    const db = getDB();
    
    // Find customer by email
    const [customers] = await db.execute(
      'SELECT id, email, tier, license_status, expires_at FROM customers WHERE email = ? AND email_verified = 1',
      [email]
    );
    
    if (!customers.length) {
      return res.json({ valid: false, reason: 'Customer not found or email not verified' });
    }
    
    const customer = customers[0];
    
    // Check license status and expiration
    if (customer.license_status !== 'trial' && customer.license_status !== 'active') {
      return res.json({ valid: false, reason: 'License not active' });
    }
    
    if (customer.expires_at && new Date() > new Date(customer.expires_at)) {
      return res.json({ valid: false, reason: 'License expired' });
    }
    
    // Check if device is registered
    const [devices] = await db.execute(
      'SELECT id, device_name, registered_at FROM devices WHERE customer_id = ? AND device_uuid = ? AND status = "active"',
      [customer.id, deviceUuid]
    );
    
    if (!devices.length) {
      return res.json({ valid: false, reason: 'Device not registered' });
    }
    
    const device = devices[0];
    
    // Update last seen
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
router.get('/status', async (req, res) => {
  try {
    await ensureDBInitialized();
    const db = getDB();
    
    // Test database connection
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