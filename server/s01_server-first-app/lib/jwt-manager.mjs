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

export function createLicenseToken(payload) {
  const tokenPayload = {
    sub: payload.customerId,
    email: payload.email,
    hw: payload.hwHash,
    app: 'aiprivatesearch',
    tier: payload.subscriptionTier || 1,
    ver: payload.appVersion || '19.61',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 3600) // 30 days
  };

  return jwt.sign(tokenPayload, privateKey, { algorithm: 'RS256' });
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