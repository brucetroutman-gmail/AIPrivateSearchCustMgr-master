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
