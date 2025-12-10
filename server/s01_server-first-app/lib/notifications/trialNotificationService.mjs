import mysql from 'mysql2/promise';
import { EmailService } from '../email/emailService.mjs';
import dotenv from 'dotenv';

dotenv.config();

export class TrialNotificationService {
  constructor() {
    this.dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'aiprivatesearch'
    };
    this.emailService = new EmailService();
  }

  async getConnection() {
    return await mysql.createConnection(this.dbConfig);
  }

  async checkExpiringTrials() {
    const connection = await this.getConnection();
    
    try {
      const [trials] = await connection.execute(`
        SELECT l.id, l.customer_id, l.expires_at, c.email, c.customer_code
        FROM licenses l
        JOIN customers c ON l.customer_id = c.id
        WHERE l.status = 'trial'
        AND l.expires_at IS NOT NULL
        AND (
          DATE(l.expires_at) = DATE_ADD(CURDATE(), INTERVAL 7 DAY) OR
          DATE(l.expires_at) = DATE_ADD(CURDATE(), INTERVAL 3 DAY) OR
          DATE(l.expires_at) = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
        )
      `);

      for (const trial of trials) {
        const daysLeft = Math.ceil((new Date(trial.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
        await this.sendExpirationWarning(trial.email, trial.customer_code, trial.expires_at, daysLeft);
      }

      return { checked: trials.length };
    } finally {
      await connection.end();
    }
  }

  async handleExpiredTrials() {
    const connection = await this.getConnection();
    
    try {
      const [expired] = await connection.execute(`
        SELECT l.id, l.customer_id, l.expires_at, c.email
        FROM licenses l
        JOIN customers c ON l.customer_id = c.id
        WHERE l.status = 'trial'
        AND l.expires_at < NOW()
        AND (l.grace_period_ends IS NULL OR l.grace_period_ends < NOW())
      `);

      for (const trial of expired) {
        const gracePeriodEnds = new Date();
        gracePeriodEnds.setDate(gracePeriodEnds.getDate() + 7);
        
        await connection.execute(
          'UPDATE licenses SET status = ?, grace_period_ends = ? WHERE id = ?',
          ['expired', gracePeriodEnds, trial.id]
        );

        await this.sendGracePeriodNotification(trial.email, gracePeriodEnds);
      }

      return { expired: expired.length };
    } finally {
      await connection.end();
    }
  }

  async sendExpirationWarning(email, licenseKey, expiresAt, daysLeft) {
    const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const upgradeUrl = process.env.UPGRADE_URL || 'https://custmgr.aiprivatesearch.com/subscription-plans.html';
    
    await this.emailService.sendTrialExpirationEmail(email, licenseKey, expiryDate, daysLeft, upgradeUrl);
  }

  async sendGracePeriodNotification(email, gracePeriodEnds) {
    const graceDate = new Date(gracePeriodEnds).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const upgradeUrl = process.env.UPGRADE_URL || 'https://custmgr.aiprivatesearch.com/subscription-plans.html';
    
    await this.emailService.sendGracePeriodEmail(email, graceDate, upgradeUrl);
  }
}
