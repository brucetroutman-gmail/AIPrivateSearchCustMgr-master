import express from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { LicensingService } from '../lib/licensing-service.mjs';
import { getPublicKey } from '../lib/jwt-manager.mjs';

const router = express.Router();

// Rate limiting for activation endpoint
const activationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many activation attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation middleware
const validateActivation = [
  body('email').isEmail().normalizeEmail(),
  body('hwId').isLength({ min: 10, max: 100 }).trim(),
  body('appVersion').optional().isLength({ max: 20 }).trim(),
  body('appId').optional().isLength({ max: 50 }).trim()
];

const validateRefresh = [
  body('token').notEmpty().trim()
];

// POST /activate - Initial license activation
router.post('/activate', activationLimiter, validateActivation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { email, hwId, appVersion = '19.61' } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await LicensingService.activateLicense(email, hwId, appVersion, ipAddress);
    
    res.json({
      token: result.token,
      existing: result.existing,
      message: result.existing ? 'License already exists' : 'License activated successfully'
    });

  } catch (error) {
    console.error('Activation error:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /refresh - Token refresh
router.post('/refresh', validateRefresh, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { token } = req.body;
    const result = await LicensingService.refreshLicense(token);
    
    res.json({
      token: result.token,
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    console.error('Refresh error:', error);
    res.status(401).json({ error: error.message });
  }
});

// POST /validate - License validation
router.post('/validate', validateRefresh, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { token } = req.body;
    const result = await LicensingService.validateLicense(token);
    
    if (result.valid) {
      res.json({
        valid: true,
        payload: result.payload,
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
router.get('/status', (req, res) => {
  res.json({
    service: 'AIPrivateSearch Licensing',
    status: 'active',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

export default router;