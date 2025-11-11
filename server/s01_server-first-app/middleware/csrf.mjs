 
 
import crypto from 'crypto';
import { secureLog } from '../../../shared/utils/logger.mjs';

// Store CSRF tokens in memory (in production, use Redis or database)
const csrfTokens = new Map();

// Generate a secure random token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Generate and store CSRF token
export function generateCSRFToken(req, res, next) {
  const token = generateToken();
  const sessionId = req.sessionID || req.ip; // Use session ID or IP as fallback
  
  // Store token with expiration (1 hour)
  csrfTokens.set(sessionId, {
    token,
    expires: Date.now() + 3600000 // 1 hour
  });
  
  req.csrfToken = token;
  next();
}

// Validate CSRF token
export function validateCSRFToken(req, res, next) {
  // Skip validation for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const sessionId = req.sessionID || req.ip;
  const submittedToken = req.headers['x-csrf-token'] || req.body._csrf;
  
  // In development, allow requests without CSRF token with warning
  if (!submittedToken) {
    // secureLog sanitizes all inputs to prevent log injection
    secureLog.error('CSRF token missing for method:', req.method);
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
    return res.status(403).json({ error: 'CSRF token missing' });
  }
  
  const storedTokenData = csrfTokens.get(sessionId);
  
  if (!storedTokenData) {
    // secureLog sanitizes all inputs to prevent log injection
    secureLog.error('CSRF token invalid for method:', req.method);
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
    return res.status(403).json({ error: 'CSRF token invalid' });
  }
  
  // Check if token expired
  if (Date.now() > storedTokenData.expires) {
    csrfTokens.delete(sessionId);
    // secureLog sanitizes all inputs to prevent log injection
    secureLog.error('CSRF token expired for method:', req.method);
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
    return res.status(403).json({ error: 'CSRF token expired' });
  }
  
  // Validate token
  if (storedTokenData.token !== submittedToken) {
    // secureLog sanitizes all inputs to prevent log injection
    secureLog.error('CSRF token mismatch for method:', req.method);
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
    return res.status(403).json({ error: 'CSRF token invalid' });
  }
  
  next();
}

// Cleanup expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, tokenData] of csrfTokens.entries()) {
    if (now > tokenData.expires) {
      csrfTokens.delete(sessionId);
    }
  }
}, 300000); // Clean up every 5 minutes