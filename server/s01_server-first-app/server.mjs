import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
// Try multiple .env-custmgr locations
const envPaths = [
  '/Users/Shared/AIPrivateSearch/.env-custmgr',  // macOS
  '/webs/AIPrivateSearch/.env-custmgr',          // Ubuntu
  '.env'                                         // Local fallback
];

for (const envPath of envPaths) {
  try {
    dotenv.config({ path: envPath });
    if (process.env.DB_HOST) break;
  } catch (e) {}
}

const app = express();
const PORT = process.env.PORT || 56304;

// Trust proxy for rate limiting behind Caddy
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration for licensing system
app.use(cors({
  origin: [
    'http://localhost:53000',
    'http://localhost:53001', 
    'http://127.0.0.1:53000',
    'http://127.0.0.1:53001',
    'http://localhost:56303',
    'https://custmgr.aiprivatesearch.com',
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/,
    ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Import UserManager for auth middleware
import { UserManager } from './lib/auth/userManager.mjs';
const userManager = new UserManager();

// Auth check middleware for protected routes
app.use(async (req, res, next) => {
  console.log('[SERVER AUTH] Path:', req.path, 'Method:', req.method);
  
  // Redirect root to user-management
  if (req.path === '/') {
    console.log('[SERVER AUTH] Root path, redirecting to user-management.html');
    return res.redirect('/user-management.html');
  }
  
  // Skip auth for user-management page, auth endpoints, licensing endpoints, test endpoints, customer endpoints, and static assets
  if (req.path === '/user-management.html' || 
      req.path === '/email-test.html' ||
      req.path === '/customer-registration.html' ||
      req.path.startsWith('/api/auth/') || 
      req.path.startsWith('/api/licensing/') || 
      req.path.startsWith('/api/test/') ||
      req.path.startsWith('/api/customers/') ||
      req.path === '/api/health' ||
      req.path.endsWith('.css') ||
      req.path.endsWith('.js') ||
      req.path.endsWith('.ico') ||
      req.path.endsWith('.png')) {
    console.log('[SERVER AUTH] Skipping auth for:', req.path);
    return next();
  }
  
  // Check for session token in localStorage (sent via Authorization header)
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  console.log('[SERVER AUTH] SessionId:', sessionId ? 'exists' : 'none');
  
  if (!sessionId) {
    if (req.path.startsWith('/api/')) {
      console.log('[SERVER AUTH] No session for API, returning 401');
      return res.status(401).json({ error: 'Authentication required' });
    }
    console.log('[SERVER AUTH] No session, redirecting to user-management.html');
    return res.redirect('/user-management.html');
  }
  
  // Verify session
  try {
    const user = await userManager.validateSession(sessionId);
    
    if (!user) {
      console.log('[SERVER AUTH] Session validation failed - no user');
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Session expired' });
      }
      return res.redirect('/user-management.html');
    }
    
    console.log('[SERVER AUTH] Session valid for user:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.log('[SERVER AUTH] Session validation error:', error.message);
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    return res.redirect('/user-management.html');
  }
});

// Serve static files from client
app.use(express.static(path.join(process.cwd(), '../../client/c01_client-first-app')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'aiprivatesearch-custmgr'
  });
});

// Import routes and middleware
import authRouter from './routes/auth.mjs';
import licensingRouter from './routes/licensing.mjs';
import { generateCSRFToken, validateCSRFToken } from './middleware/csrf.mjs';
import { validateOrigin } from './middleware/auth.mjs';
import { errorHandler } from './middleware/errorHandler.mjs';
import { initializeLicensingDB } from './lib/licensing-db.mjs';
import { requireAuth } from './middleware/authMiddleware.mjs';

// CSRF token endpoint
app.get('/api/csrf-token', generateCSRFToken, (req, res) => {
  res.json({ csrfToken: req.csrfToken });
});

// Initialize licensing database
initializeLicensingDB().catch(console.error);

// Initialize customer manager database
import { initializeDB } from './lib/database/init.mjs';
initializeDB().then(() => {
  console.log('Customer manager database ready');
}).catch(console.error);

// API routes
app.use('/api/auth', validateOrigin, authRouter);
app.use('/api/users', requireAuth, (req, res) => res.json({ message: 'Users endpoint' }));
app.use('/api/dashboard', requireAuth, (req, res) => res.json({ message: 'Dashboard data' }));
app.use('/api/licensing', licensingRouter);

// Customer routes
import customersRouter from './routes/customers.mjs';
app.use('/api/customers', customersRouter);

// Test routes
import testRouter from './routes/test.mjs';
app.use('/api/test', testRouter);

// app.use('/api/payments', validateOrigin, validateCSRFToken, paymentRouter);

// Catch-all for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found', path: req.originalUrl });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Cleanup expired sessions every minute
setInterval(async () => {
  try {
    const { UserManager } = await import('./lib/auth/userManager.mjs');
    const userManager = new UserManager();
    const pool = (await import('./lib/database/connection.mjs')).default;
    const connection = await pool.getConnection();
    await connection.changeUser({ database: 'aiprivatesearchcustmgr' });
    await connection.execute('DELETE FROM sessions WHERE expires_at < NOW()');
    connection.release();
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
}, 60000); // Every minute

// Check trial expirations daily at midnight
import { TrialNotificationService } from './lib/notifications/trialNotificationService.mjs';
const trialService = new TrialNotificationService();

const scheduleTrialChecks = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = midnight - now;
  
  setTimeout(() => {
    runTrialChecks();
    setInterval(runTrialChecks, 24 * 60 * 60 * 1000); // Every 24 hours
  }, msUntilMidnight);
};

const runTrialChecks = async () => {
  try {
    console.log('[TRIAL CHECK] Running expiration checks...');
    const expiring = await trialService.checkExpiringTrials();
    console.log(`[TRIAL CHECK] Checked ${expiring.checked} expiring trials`);
    
    const expired = await trialService.handleExpiredTrials();
    console.log(`[TRIAL CHECK] Handled ${expired.expired} expired trials`);
  } catch (error) {
    console.error('[TRIAL CHECK] Error:', error);
  }
};

scheduleTrialChecks();
console.log('Trial notification service scheduled');

// Start server
const server = app.listen(PORT, () => {
  console.log(`AI Private Search Customer Manager server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Session timeout: 5 minutes');
  console.log('Trial notifications: Daily at midnight');
});

server.on('error', (err) => {
  console.error('Server error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});

export default app;