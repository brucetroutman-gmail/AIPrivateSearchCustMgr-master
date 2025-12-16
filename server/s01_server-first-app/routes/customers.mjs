import express from 'express';
import bcrypt from 'bcrypt';
import { CustomerManager } from '../lib/customers/customerManager.mjs';
import { EmailService } from '../lib/email/emailService.mjs';
import { requireAuth } from '../middleware/authMiddleware.mjs';
import pool from '../lib/database/connection.mjs';

const router = express.Router();
const customerManager = new CustomerManager();
const emailService = new EmailService();

// Public customer registration endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, phone, city, state, postalCode, password } = req.body;
    
    if (!email || !phone || !city || !state || !postalCode || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const result = await customerManager.registerCustomer({
      email,
      phone,
      city,
      state,
      postalCode,
      password
    });
    
    // Send verification code via email
    try {
      await emailService.sendVerificationCode(email, result.verificationCode);
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Continue anyway - code is logged for development
    }
    console.log(`Verification code for ${email}: ${result.verificationCode}`);
    
    res.json({ 
      success: true, 
      customerId: result.customerId,
      requiresVerification: true,
      message: 'Registration successful. Please check your email for verification code.'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Email verification endpoint
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const result = await customerManager.verifyEmail({ email, code });
    
    // Send welcome email with license info and download link
    try {
      await emailService.sendWelcomeEmail(result.email, result.licenseKey, result.expiresAt);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Continue anyway - user already has license
    }
    
    res.json({ 
      success: true, 
      customerId: result.customerId,
      licenseKey: result.licenseKey,
      tier: result.tier,
      expiresAt: result.expiresAt,
      message: 'Email verified successfully. You have been granted 60 days free access to Standard tier.'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Password reset request
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await customerManager.requestPasswordReset(email);
    
    // Send reset email
    try {
      await emailService.sendPasswordResetEmail(email, result.resetToken);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
    }
    
    res.json({ 
      success: true, 
      message: 'If the email exists, a password reset link has been sent.'
    });
  } catch (error) {
    // Don't reveal if email exists or not
    res.json({ 
      success: true, 
      message: 'If the email exists, a password reset link has been sent.'
    });
  }
});

// Password reset
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    const result = await customerManager.resetPassword(token, password);
    
    // Send confirmation email
    try {
      await emailService.sendPasswordResetConfirmation(result.email);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }
    
    res.json({ 
      success: true, 
      message: 'Password reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Customer login validation
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const customer = await customerManager.validateCustomerLogin(email, password);
    
    res.json({ 
      success: true, 
      customer: {
        id: customer.id,
        email: customer.email,
        role: customer.role
      }
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Get all customers (admin/manager only)
router.get('/', requireAuth, async (req, res) => {
  try {
    if (!['admin', 'manager'].includes(req.user.userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const connection = await pool.getConnection();
    const [customers] = await connection.execute(
      'SELECT id, email, phone, city, state, postal_code, customer_code, email_verified, role, active, created_at FROM customers ORDER BY created_at DESC'
    );
    connection.release();
    
    res.json({ customers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer by ID (admin/manager can access any, customers only their own)
router.get('/:customerId', requireAuth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const isAdmin = ['admin', 'manager'].includes(req.user.userRole);
    
    if (!isAdmin && req.user.userType === 'customer' && req.user.id != customerId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const connection = await pool.getConnection();
    const [customers] = await connection.execute(
      'SELECT id, email, phone, city, state, postal_code, customer_code, email_verified, role, active, created_at FROM customers WHERE id = ?',
      [customerId]
    );
    connection.release();
    
    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ customer: customers[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update customer (admin/manager can update any, customers only their own)
router.put('/:customerId', requireAuth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { email, phone, city, state, postal_code, active, password } = req.body;
    const isAdmin = ['admin', 'manager'].includes(req.user.userRole);
    
    if (!isAdmin && req.user.userType === 'customer' && req.user.id != customerId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const connection = await pool.getConnection();
    
    let query = 'UPDATE customers SET email = ?, phone = ?, city = ?, state = ?, postal_code = ?';
    let params = [email, phone, city, state, postal_code];
    
    // Only admin/manager can change active status
    if (isAdmin && typeof active === 'boolean') {
      query += ', active = ?';
      params.push(active);
    }
    
    // Handle password update
    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);
      query += ', password_hash = ?';
      params.push(passwordHash);
    }
    
    query += ' WHERE id = ?';
    params.push(customerId);
    
    await connection.execute(query, params);
    connection.release();
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deactivate customer (admin/manager only)
router.delete('/:customerId', requireAuth, async (req, res) => {
  try {
    if (!['admin', 'manager'].includes(req.user.userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { customerId } = req.params;
    const connection = await pool.getConnection();
    
    await connection.execute(
      'UPDATE customers SET active = 0 WHERE id = ?',
      [customerId]
    );
    connection.release();
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer license info (customers can only see their own)
router.get('/:customerId/license', requireAuth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const isAdmin = ['admin', 'manager'].includes(req.user.userRole);
    
    if (!isAdmin && req.user.userType === 'customer' && req.user.id != customerId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const connection = await pool.getConnection();
    
    // Get license info with device count
    const [licenses] = await connection.execute(
      `SELECT l.id, l.tier, l.status, l.trial_started_at, l.expires_at, l.grace_period_ends, l.created_at,
              c.customer_code,
              COUNT(d.id) as device_count,
              CASE l.tier 
                WHEN 1 THEN 'Standard'
                WHEN 2 THEN 'Premium' 
                WHEN 3 THEN 'Professional'
                ELSE 'Unknown'
              END as tier_name,
              CASE l.tier
                WHEN 1 THEN 2
                WHEN 2 THEN 5
                WHEN 3 THEN 10
                ELSE 0
              END as max_devices
       FROM licenses l
       JOIN customers c ON l.customer_id = c.id
       LEFT JOIN devices d ON l.id = d.license_id
       WHERE l.customer_id = ?
       GROUP BY l.id
       ORDER BY l.created_at DESC
       LIMIT 1`,
      [customerId]
    );
    
    connection.release();
    
    if (licenses.length === 0) {
      return res.status(404).json({ error: 'No license found' });
    }
    
    const license = licenses[0];
    
    // Calculate days remaining
    const now = new Date();
    const expiresAt = new Date(license.expires_at);
    const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    
    res.json({ 
      license: {
        ...license,
        days_remaining: daysRemaining,
        is_expired: daysRemaining <= 0,
        available_devices: license.max_devices - license.device_count
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
