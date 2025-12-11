import express from 'express';
import { CustomerManager } from '../lib/customers/customerManager.mjs';
import { EmailService } from '../lib/email/emailService.mjs';

const router = express.Router();
const customerManager = new CustomerManager();
const emailService = new EmailService();

// Public customer registration endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, phone, city, state, postalCode } = req.body;
    
    if (!email || !phone || !city || !state || !postalCode) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const result = await customerManager.registerCustomer({
      email,
      phone,
      city,
      state,
      postalCode
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

export default router;
