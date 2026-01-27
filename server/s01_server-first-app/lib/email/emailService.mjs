import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export class EmailService {
  constructor() {
    console.log('[EMAIL] Initializing with:', {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER,
      hasPassword: !!process.env.EMAIL_PASSWORD
    });
    
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || 'aiprivatesearch@gmail.com',
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async sendVerificationCode(email, code) {
    const mailOptions = {
      from: 'AI Private Search <aiprivatesearch@gmail.com>',
      to: email,
      subject: 'Verify Your Email - AI Private Search',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #87ceeb;">Welcome to AI Private Search!</h2>
          <p>Thank you for registering. Please use the verification code below to complete your registration:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #333; letter-spacing: 5px; margin: 0;">${code}</h1>
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">AI Private Search - Your Private AI Assistant</p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendWelcomeEmail(email, licenseKey, expiresAt) {
    const downloadUrl = process.env.AIPS_DOWNLOAD_URL || 'https://custmgr.aiprivatesearch.com/downloads/load-AIPrivateSearch-1108.command';
    const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const mailOptions = {
      from: 'AI Private Search <aiprivatesearch@gmail.com>',
      to: email,
      subject: 'Welcome to AI Private Search - Your 60-Day Trial Starts Now!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #87ceeb; margin-bottom: 20px;">Welcome to AI Private Search!</h2>
          
          <p>Congratulations! Your email has been verified and your 60-day free trial has started.</p>
          
          <div style="background: #f8f9fa; border-left: 4px solid #87ceeb; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Your License Information</h3>
            <p style="margin: 10px 0;"><strong>License Key:</strong> <code style="background: #fff; padding: 5px 10px; border-radius: 4px;">${licenseKey}</code></p>
            <p style="margin: 10px 0;"><strong>Tier:</strong> Standard (60 days free)</p>
            <p style="margin: 10px 0;"><strong>Trial Expires:</strong> ${expiryDate}</p>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #856404;">📥 Download & Install</h3>
            <p style="margin: 10px 0;">Click the button below to download AI Private Search:</p>
            <a href="${downloadUrl}" style="display: inline-block; background: #87ceeb; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 10px 0;">Download Installer</a>
            <p style="margin: 10px 0; font-size: 14px; color: #666;">After downloading, run the installer and use your license key to activate.</p>
          </div>
          
          <div style="margin: 30px 0;">
            <h3 style="color: #333;">What's Included in Your Trial:</h3>
            <ul style="line-height: 1.8;">
              <li>Private AI-powered search</li>
              <li>Document collections</li>
              <li>2 device activations</li>
              <li>60 days of full access</li>
            </ul>
          </div>
          
          <div style="background: #e7f3ff; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>💡 Tip:</strong> Save this email for future reference. You'll need your license key to activate AI Private Search.</p>
          </div>
          
          <p style="margin-top: 30px;">If you have any questions, feel free to contact us at <a href="mailto:support@aiprivatesearch.com" style="color: #87ceeb;">support@aiprivatesearch.com</a></p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">AI Private Search - Your Private AI Assistant</p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Welcome email send error:', error);
      throw new Error('Failed to send welcome email');
    }
  }

  async sendTrialExpirationEmail(email, licenseKey, expiryDate, daysLeft, upgradeUrl) {
    const urgency = daysLeft === 1 ? 'Tomorrow' : `in ${daysLeft} Days`;
    const subject = daysLeft === 1 
      ? '⚠️ Your AI Private Search Trial Expires Tomorrow!'
      : `Your AI Private Search Trial Expires in ${daysLeft} Days`;

    const mailOptions = {
      from: 'AI Private Search <aiprivatesearch@gmail.com>',
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #856404; margin-top: 0;">⚠️ Trial Expiring ${urgency}</h2>
          </div>
          
          <p>Your AI Private Search trial is expiring soon!</p>
          
          <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 5px 0;"><strong>License Key:</strong> ${licenseKey}</p>
            <p style="margin: 5px 0;"><strong>Expires:</strong> ${expiryDate}</p>
            <p style="margin: 5px 0;"><strong>Days Remaining:</strong> ${daysLeft}</p>
          </div>
          
          <p>Don't lose access to your private AI assistant! Upgrade now to continue enjoying:</p>
          <ul style="line-height: 1.8;">
            <li>Private AI-powered search</li>
            <li>Document collections</li>
            <li>Multiple device support</li>
            <li>Priority support</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${upgradeUrl}" style="display: inline-block; background: #87ceeb; color: #000; padding: 15px 40px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">Upgrade Now</a>
          </div>
          
          <p style="font-size: 14px; color: #666;">Questions? Contact us at <a href="mailto:support@aiprivatesearch.com" style="color: #87ceeb;">support@aiprivatesearch.com</a></p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">AI Private Search - Your Private AI Assistant</p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Trial expiration email error:', error);
      throw new Error('Failed to send trial expiration email');
    }
  }

  async sendGracePeriodEmail(email, graceDate, upgradeUrl) {
    const mailOptions = {
      from: 'AI Private Search <aiprivatesearch@gmail.com>',
      to: email,
      subject: '🔴 Your AI Private Search Trial Has Expired - Grace Period Active',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #721c24; margin-top: 0;">🔴 Trial Expired - Grace Period Active</h2>
          </div>
          
          <p>Your AI Private Search trial has expired, but we've activated a 7-day grace period for you.</p>
          
          <div style="background: #fff3cd; padding: 20px; margin: 20px 0; border-radius: 4px; border: 1px solid #ffc107;">
            <p style="margin: 5px 0; font-weight: bold;">Grace Period Ends: ${graceDate}</p>
            <p style="margin: 5px 0; font-size: 14px;">After this date, your access will be suspended.</p>
          </div>
          
          <p><strong>Upgrade now to maintain uninterrupted access!</strong></p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${upgradeUrl}" style="display: inline-block; background: #dc3545; color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">Upgrade to Continue</a>
          </div>
          
          <p style="font-size: 14px; color: #666;">Need help? Contact us at <a href="mailto:support@aiprivatesearch.com" style="color: #87ceeb;">support@aiprivatesearch.com</a></p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">AI Private Search - Your Private AI Assistant</p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Grace period email error:', error);
      throw new Error('Failed to send grace period email');
    }
  }

  async sendPasswordResetEmail(email, resetToken) {
    // Use RESET_BASE_URL from env, or default to production URL
    const baseUrl = process.env.RESET_BASE_URL || 'https://custmgr.aiprivatesearch.com';
    const resetUrl = `${baseUrl}/reset-password.html?token=${resetToken}`;
    
    const mailOptions = {
      from: 'AI Private Search <aiprivatesearch@gmail.com>',
      to: email,
      subject: 'Reset Your Password - AI Private Search',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #87ceeb; margin-bottom: 20px;">Password Reset Request</h2>
          
          <p>You requested a password reset for your AI Private Search account.</p>
          
          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: #87ceeb; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
            </div>
            <p style="margin: 0; font-size: 14px; color: #666;">This link will expire in 1 hour.</p>
          </div>
          
          <p style="font-size: 14px; color: #666;">If you didn't request this reset, please ignore this email. Your password will remain unchanged.</p>
          
          <p style="font-size: 14px; color: #666;">If the button doesn't work, copy and paste this link: <br><a href="${resetUrl}" style="color: #87ceeb;">${resetUrl}</a></p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">AI Private Search - Your Private AI Assistant</p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Password reset email error:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendPasswordResetConfirmation(email) {
    const mailOptions = {
      from: 'AI Private Search <aiprivatesearch@gmail.com>',
      to: email,
      subject: 'Password Reset Successful - AI Private Search',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #87ceeb; margin-bottom: 20px;">Password Reset Successful</h2>
          
          <p>Your password has been successfully reset for your AI Private Search account.</p>
          
          <div style="background: #d4edda; border: 1px solid #28a745; border-radius: 4px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; color: #155724;">✅ You can now log in with your new password.</p>
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="https://custmgr.aiprivatesearch.com/user-management.html" style="display: inline-block; background: #87ceeb; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">Login to Account</a>
          </div>
          
          <p style="font-size: 14px; color: #666;">If you didn't make this change, please contact support immediately.</p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">AI Private Search - Your Private AI Assistant</p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Password reset confirmation email error:', error);
      throw new Error('Failed to send confirmation email');
    }
  }

  async sendTestEmail(to, subject, message) {
    console.log('[EMAIL] Sending test email to:', to);
    
    const mailOptions = {
      from: 'AI Private Search <aiprivatesearch@gmail.com>',
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #87ceeb;">Test Email</h2>
          <p>${message}</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">AI Private Search - Your Private AI Assistant</p>
        </div>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('[EMAIL] Send success:', result.messageId);
      return { success: true };
    } catch (error) {
      console.error('[EMAIL] Send error:', error.message);
      console.error('[EMAIL] Error details:', error);
      throw new Error('Failed to send test email');
    }
  }
}
