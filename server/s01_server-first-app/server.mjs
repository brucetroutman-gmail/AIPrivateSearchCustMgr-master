import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { loadSettings } from './lib/settings-loader.mjs';

// Load and validate settings.json — server will not start if invalid
try {
  loadSettings();
  console.log('Settings loaded successfully from settings.json');
} catch (error) {
  console.error('FATAL: Failed to load settings.json:', error.message);
  process.exit(1);
}

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
  } catch (_e) { /* dotenv load failure is expected when file doesn't exist */ }
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
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["https://js.stripe.com"],
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
    'http://localhost:56305',  // AIPS client
    'https://custmgr.aiprivatesearch.com',
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/,
    ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token']
}));

// Stripe webhook — must be registered BEFORE express.json() body parser
import paymentsRouter from './routes/payments.mjs';
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Import UnifiedUserManager for auth middleware
import { UnifiedUserManager } from './lib/auth/unifiedUserManager.mjs';
const userManager = new UnifiedUserManager();

// Auth check middleware — only protects API endpoints, not page navigation
app.use(async (req, res, next) => {
  // Only enforce auth on API routes (except public ones)
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  // Public API endpoints
  if (req.path.startsWith('/api/auth/') ||
      req.path.startsWith('/api/payments/webhook') ||
      req.path.startsWith('/api/licensing/') ||
      req.path.startsWith('/api/customers/register') ||
      req.path.startsWith('/api/customers/verify-email') ||
      req.path.startsWith('/api/customers/forgot-password') ||
      req.path.startsWith('/api/customers/reset-password') ||
      req.path.startsWith('/api/customers/login') ||
      req.path.startsWith('/api/test/') ||
      req.path.startsWith('/api/debug/') ||
      req.path === '/api/health') {
    return next();
  }

  // All other API routes require a valid session
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = await userManager.validateSession(sessionId);
    if (!user) {
      return res.status(401).json({ error: 'Session expired' });
    }
    req.user = user;
    next();
  } catch (_error) {
    return res.status(401).json({ error: 'Invalid session' });
  }
});

// Serve static files from client
app.use(express.static(path.join(process.cwd(), 'client/c01_client-first-app')));

// Root and clean URL redirects
app.get('/', (req, res) => res.redirect('/login.html'));
app.get('/login', (req, res) => res.redirect('/login.html'));
app.get('/index', (req, res) => res.redirect('/index.html'));

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
import { generateCSRFToken } from './middleware/csrf.mjs';
import { validateOrigin } from './middleware/auth.mjs';
import { errorHandler } from './middleware/errorHandler.mjs';
import { initializeLicensingDB } from './lib/licensing-db.mjs';
import { requireAuth } from './middleware/authMiddleware.mjs';

// CSRF token endpoint
app.get('/api/csrf-token', generateCSRFToken, (req, res) => {
  res.json({ csrfToken: req.csrfToken });
});

// Initialize licensing database
const initLicensingDB = async () => {
  try {
    await initializeLicensingDB();
    console.log('Licensing database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize licensing database:', error);
    process.exit(1);
  }
};

// Initialize customer manager database
const initCustomerDB = async () => {
  try {
    const { initializeDB } = await import('./lib/database/init.mjs');
    await initializeDB();
    console.log('Customer manager database ready');
  } catch (error) {
    console.error('Failed to initialize customer database:', error);
    process.exit(1);
  }
};

// Initialize both databases before starting server
Promise.all([initLicensingDB(), initCustomerDB()]).then(() => {
  console.log('All databases initialized, starting server...');
  
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
}).catch((error) => {
  console.error('Database initialization failed:', error);
  process.exit(1);
});

// API routes
app.use('/api/auth', validateOrigin, authRouter);
app.use('/api/users', requireAuth, (req, res) => res.json({ message: 'Users endpoint' }));
app.use('/api/dashboard', requireAuth, (req, res) => res.json({ message: 'Dashboard data' }));
app.use('/api/licensing', licensingRouter);

// Customer routes
import customersRouter from './routes/customers.mjs';
app.use('/api/customers', customersRouter);

// Device routes
import devicesRouter from './routes/devices.mjs';
app.use('/api/devices', devicesRouter);

// Test routes
import testRouter from './routes/test.mjs';
app.use('/api/test', testRouter);

// Debug routes
import debugRouter from './routes/debug.mjs';
import analyticsRouter from './routes/analytics.mjs';
import settingsRouter from './routes/settings.mjs';
app.use('/api/debug', debugRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/settings', settingsRouter);

// app.use('/api/payments', validateOrigin, validateCSRFToken, paymentRouter);
app.use('/api/payments', paymentsRouter);

// Catch-all for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found', path: req.originalUrl });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Cleanup expired sessions every minute
setInterval(async () => {
  try {
    const pool = (await import('./lib/database/connection.mjs')).default;
    const connection = await pool.getConnection();
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



export default app;