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
    
    // Send reset code email
    try {
      await emailService.sendPasswordResetCode(email, result.resetCode);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
    }
    console.log(`Reset code for ${email}: ${result.resetCode}`);
    
    res.json({ 
      success: true, 
      message: 'If the email exists, a reset code has been sent.'
    });
  } catch (error) {
    // Don't reveal if email exists or not
    res.json({ 
      success: true, 
      message: 'If the email exists, a reset code has been sent.'
    });
  }
});

// Password reset with code
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, password } = req.body;
    
    if (!email || !code || !password) {
      return res.status(400).json({ error: 'Email, code, and password are required' });
    }

    const result = await customerManager.resetPassword(code, password);
    
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

// Get all customers with license information (admin/manager only)
router.get('/with-licenses', requireAuth, async (req, res) => {
  try {
    if (!['admin', 'manager'].includes(req.user.userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const connection = await pool.getConnection();
    const [customers] = await connection.execute(
      `SELECT c.id, c.email, c.phone, c.city, c.state, c.postal_code, c.customer_code, 
              c.email_verified, c.role, c.active, c.created_at,
              c.tier, c.license_status, c.expires_at, c.trial_started_at, c.grace_period_ends,
              COUNT(d.id) as device_count,
              CASE c.tier 
                WHEN 1 THEN 'Standard'
                WHEN 2 THEN 'Premium' 
                WHEN 3 THEN 'Professional'
                ELSE 'Standard'
              END as tier_name,
              CASE c.tier
                WHEN 1 THEN 2
                WHEN 2 THEN 5
                WHEN 3 THEN 10
                ELSE 2
              END as max_devices
       FROM customers c
       LEFT JOIN devices d ON c.id = d.customer_id AND d.status = 'active'
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );
    
    // Process customers to include license info and calculate days remaining
    const processedCustomers = customers.map(customer => {
      const now = new Date();
      const expiresAt = customer.expires_at ? new Date(customer.expires_at) : null;
      const daysRemaining = expiresAt ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : 0;
      
      const license = {
        tier: customer.tier,
        tier_name: customer.tier_name,
        status: customer.license_status,
        expires_at: customer.expires_at,
        trial_started_at: customer.trial_started_at,
        grace_period_ends: customer.grace_period_ends,
        device_count: customer.device_count,
        max_devices: customer.max_devices,
        days_remaining: daysRemaining,
        is_expired: daysRemaining <= 0
      };
      
      return {
        id: customer.id,
        email: customer.email,
        phone: customer.phone,
        city: customer.city,
        state: customer.state,
        postal_code: customer.postal_code,
        customer_code: customer.customer_code,
        email_verified: customer.email_verified,
        role: customer.role,
        active: customer.active,
        created_at: customer.created_at,
        license
      };
    });
    
    connection.release();
    res.json({ customers: processedCustomers });
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
      'SELECT id, email, phone, city, state, postal_code, customer_code, email_verified, role, active, tier, license_status, expires_at, trial_started_at, grace_period_ends, created_at FROM customers WHERE id = ?',
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
    const { email, phone, city, state, postal_code, active, password, tier, license_status, expires_at } = req.body;
    const isAdmin = ['admin', 'manager'].includes(req.user.userRole);
    
    if (!isAdmin && req.user.userType === 'customer' && req.user.id != customerId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const connection = await pool.getConnection();
    
    let query = 'UPDATE customers SET email = ?, phone = ?, city = ?, state = ?, postal_code = ?';
    let params = [email, phone, city, state, postal_code];
    
    // Only admin/manager can change active status and license info
    if (isAdmin) {
      if (typeof active === 'boolean') {
        query += ', active = ?';
        params.push(active);
      }
      
      // License management for admin/manager
      if (tier && [1, 2, 3].includes(parseInt(tier))) {
        query += ', tier = ?';
        params.push(parseInt(tier));
      }
      
      if (license_status && ['trial', 'active', 'expired', 'suspended', 'cancelled'].includes(license_status)) {
        query += ', license_status = ?';
        params.push(license_status);
      }
      
      if (expires_at) {
        query += ', expires_at = ?';
        params.push(expires_at);
      }
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
    
    // Get customer with integrated license info and device count
    const [customers] = await connection.execute(
      `SELECT c.id, c.customer_code, c.tier, c.license_status as status, 
              c.trial_started_at, c.expires_at, c.grace_period_ends, c.created_at,
              COUNT(d.id) as device_count,
              CASE c.tier 
                WHEN 1 THEN 'Standard'
                WHEN 2 THEN 'Premium' 
                WHEN 3 THEN 'Professional'
                ELSE 'Standard'
              END as tier_name,
              CASE c.tier
                WHEN 1 THEN 2
                WHEN 2 THEN 5
                WHEN 3 THEN 10
                ELSE 2
              END as max_devices
       FROM customers c
       LEFT JOIN devices d ON c.id = d.customer_id AND d.status = 'active'
       WHERE c.id = ?
       GROUP BY c.id`,
      [customerId]
    );
    
    connection.release();
    
    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const customer = customers[0];
    
    // Calculate days remaining
    const now = new Date();
    const expiresAt = customer.expires_at ? new Date(customer.expires_at) : null;
    const daysRemaining = expiresAt ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : 0;
    
    res.json({ 
      license: {
        id: customer.id,
        tier: customer.tier,
        tier_name: customer.tier_name,
        status: customer.status,
        trial_started_at: customer.trial_started_at,
        expires_at: customer.expires_at,
        grace_period_ends: customer.grace_period_ends,
        created_at: customer.created_at,
        customer_code: customer.customer_code,
        device_count: customer.device_count,
        max_devices: customer.max_devices,
        days_remaining: daysRemaining,
        is_expired: daysRemaining <= 0,
        available_devices: customer.max_devices - customer.device_count
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer devices (admin/manager can access any, customers only their own)
router.get('/:customerId/devices', requireAuth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const isAdmin = ['admin', 'manager'].includes(req.user.userRole);
    
    if (!isAdmin && req.user.userType === 'customer' && req.user.id != customerId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const connection = await pool.getConnection();
    
    const [devices] = await connection.execute(
      'SELECT id, device_id as pc_code, last_seen as last_activity, first_seen as created_at, status FROM devices WHERE customer_id = ? ORDER BY first_seen DESC',
      [customerId]
    );
    
    connection.release();
    
    res.json({ devices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
