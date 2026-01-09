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

// POST /activate - Initial license activation
router.post('/activate', activationLimiter, validateActivation, async (req, res) => {
  try {
    await ensureDBInitialized();
    
    // Log raw request body before validation
    console.log('[LICENSING ROUTE] Raw request body:', JSON.stringify(req.body));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { email, hwId, appVersion = '19.61' } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    // Log email after validation/normalization
    console.log('[LICENSING ROUTE] Email after validation:', email);
    console.log('[LICENSING ROUTE] Original vs processed:', { original: req.body.email, processed: email });

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

// GET /status - Service status
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