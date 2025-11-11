 
 
import crypto from 'crypto';
import loggerPkg from '../../../shared/utils/logger.mjs';
const { secureLog } = loggerPkg;

// Rate limiting store
const rateLimitStore = new Map();

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.resetTime > 300000) { // 5 minutes
      rateLimitStore.delete(key);
    }
  }
}, 300000);

// Rate limiting middleware
function rateLimit(maxRequests = 100, windowMs = 60000) {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const key = `${clientIP}:${req.route?.path || req.path}`;
    
    let rateLimitData = rateLimitStore.get(key);
    
    if (!rateLimitData || now - rateLimitData.resetTime > windowMs) {
      rateLimitData = { count: 0, resetTime: now };
    }
    
    rateLimitData.count++;
    rateLimitStore.set(key, rateLimitData);
    
    if (rateLimitData.count > maxRequests) {
      // secureLog sanitizes all inputs to prevent log injection
      secureLog.error('Rate limit exceeded for IP:', clientIP);
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    next();
  };
}

// Authorization middleware
export function requireAuth(req, res, next) {
  // TEMPORARY: Allow all requests in development mode for testing
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'];
  const clientIP = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
  
  // Check for valid API key using timing-safe comparison
  if (process.env.API_KEY && apiKey && crypto.timingSafeEqual(
    Buffer.from(apiKey, 'utf8'),
    Buffer.from(process.env.API_KEY, 'utf8')
  )) {
    secureLog.log('Authorized request from IP:', clientIP);
    return next();
  }
  
  // secureLog sanitizes all inputs to prevent log injection
  secureLog.error('Unauthorized access attempt from IP:', clientIP, 'API Key provided:', !!apiKey);
  return res.status(401).json({ error: 'Unauthorized' });
}

export function requireAdminAuth(req, res, next) {
  // TEMPORARY: Allow admin operations in development mode
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  const adminKey = req.headers['x-admin-key'];
  const clientIP = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
  
  if (process.env.ADMIN_KEY && adminKey && crypto.timingSafeEqual(
    Buffer.from(adminKey, 'utf8'),
    Buffer.from(process.env.ADMIN_KEY, 'utf8')
  )) {
    secureLog.log('Admin authorized from IP:', clientIP);
    return next();
  }
  
  // secureLog sanitizes all inputs to prevent log injection
  secureLog.error('Admin access denied for IP:', clientIP);
  return res.status(403).json({ error: 'Admin access required' });
}

// Combined auth with rate limiting
export function requireAuthWithRateLimit(maxRequests = 100, windowMs = 60000) {
  return [rateLimit(maxRequests, windowMs), requireAuth];
}

export function requireAdminAuthWithRateLimit(maxRequests = 50, windowMs = 60000) {
  return [rateLimit(maxRequests, windowMs), requireAdminAuth];
}

// Middleware to validate request origin
export function validateOrigin(req, res, next) {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
  ];
  
  if (process.env.NODE_ENV === 'production' && origin && !allowedOrigins.includes(origin)) {
    // secureLog sanitizes all inputs to prevent log injection
    secureLog.error('Invalid origin:', origin);
    return res.status(403).json({ error: 'Forbidden origin' });
  }
  
  next();
}