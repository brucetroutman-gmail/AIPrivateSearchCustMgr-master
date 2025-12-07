import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Generate RSA key pair if not exists
function generateKeyPair() {
  const keyDir = path.join(__dirname, '../keys');
  const privateKeyPath = path.join(keyDir, 'private.pem');
  const publicKeyPath = path.join(keyDir, 'public.pem');

  if (!fs.existsSync(keyDir)) {
    fs.mkdirSync(keyDir, { recursive: true });
  }

  if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
    console.log('Generating RSA key pair for JWT signing...');
    const { generateKeyPairSync } = crypto;
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    fs.writeFileSync(privateKeyPath, privateKey);
    fs.writeFileSync(publicKeyPath, publicKey);
    console.log('RSA key pair generated successfully');
  }

  return {
    privateKey: fs.readFileSync(privateKeyPath, 'utf8'),
    publicKey: fs.readFileSync(publicKeyPath, 'utf8')
  };
}

const { privateKey, publicKey } = generateKeyPair();

// Helper functions
function getTierName(tier) {
  const names = { 1: 'standard', 2: 'premium', 3: 'professional' };
  return names[tier] || 'standard';
}

function getTierFeatures(tier) {
  const features = {
    1: ['search', 'collections'],
    2: ['search', 'multi-mode', 'collections', 'models'],
    3: ['search', 'multi-mode', 'collections', 'models', 'config', 'doc-index']
  };
  return features[tier] || features[1];
}

function getMaxDevices(tier) {
  const limits = { 1: 2, 2: 5, 3: 10 };
  return limits[tier] || 2;
}

export { getTierName, getTierFeatures, getMaxDevices };

export function createLicenseToken(payload, isRefreshToken = false) {
  const tier = payload.subscriptionTier || 1;
  const expiration = isRefreshToken ? 30 * 24 * 3600 : 24 * 3600;
  
  const tokenPayload = {
    // Standard JWT claims
    iss: 'custmgr.aiprivatesearch.com',
    sub: payload.customerId,
    aud: 'aiprivatesearch',
    jti: crypto.randomUUID(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiration,
    
    // Customer info
    email: payload.email,
    customer_id: payload.customerId,
    
    // Subscription
    tier: tier,
    tier_name: getTierName(tier),
    status: payload.status || 'active',
    
    // Device binding
    hw: payload.hwHash,
    device_id: payload.deviceId || crypto.randomUUID(),
    
    // Features & limits
    features: getTierFeatures(tier),
    max_devices: getMaxDevices(tier),
    current_devices: payload.currentDevices || 1,
    
    // Metadata
    app: 'aiprivatesearch',
    ver: payload.appVersion || '19.61',
    token_version: 2,
    token_type: isRefreshToken ? 'refresh' : 'access'
  };

  return jwt.sign(tokenPayload, privateKey, { algorithm: 'RS256' });
}

export function createRefreshToken(payload) {
  return createLicenseToken(payload, true);
}

export function verifyLicenseToken(token) {
  try {
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
}

export function refreshLicenseToken(oldToken) {
  const payload = verifyLicenseToken(oldToken);
  
  const newPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 3600)
  };

  return jwt.sign(newPayload, privateKey, { algorithm: 'RS256' });
}

export function getPublicKey() {
  return publicKey;
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}