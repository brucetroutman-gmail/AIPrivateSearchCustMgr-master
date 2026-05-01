import mysql from 'mysql2/promise';
import { EmailService } from '../email/emailService.mjs';
import { getSettings } from '../settings-loader.mjs';
import dotenv from 'dotenv';

const envPaths = [
  '/Users/Shared/AIPrivateSearch/.env-custmgr',
  '/webs/AIPrivateSearch/.env-custmgr',
  '.env'
];

for (const envPath of envPaths) {
  try {
    dotenv.config({ path: envPath });
    if (process.env.DB_HOST) break;
  } catch (_e) { /* dotenv load failure is expected when file doesn't exist */ }
}

export class TrialNotificationService {
  constructor() {
    this.dbConfig = {
      host: process.env.DB_HOST,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE
    };
    this.emailService = new EmailService();
  }

  async getConnection() {
    return await mysql.createConnection(this.dbConfig);
  }

  async checkExpiringTrials() {
    const connection = await this.getConnection();
    const warningDays = getSettings().trial_warning_days;

    try {
      const placeholders = warningDays.map(() => `DATE(expires_at) = DATE_ADD(CURDATE(), INTERVAL ? DAY)`).join(' OR ');
      const [trials] = await connection.execute(`
        SELECT id, customer_code, expires_at, email
        FROM customers
        WHERE license_status = 'trial'
        AND expires_at IS NOT NULL
        AND (${placeholders})
      `, warningDays);

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
    const graceDays = getSettings().grace_period_days;

    try {
      const [expired] = await connection.execute(`
        SELECT id, expires_at, email
        FROM customers
        WHERE license_status = 'trial'
        AND expires_at < NOW()
        AND (grace_period_ends IS NULL OR grace_period_ends < NOW())
      `);

      for (const trial of expired) {
        const gracePeriodEnds = new Date();
        gracePeriodEnds.setDate(gracePeriodEnds.getDate() + graceDays);

        await connection.execute(
          'UPDATE customers SET license_status = ?, grace_period_ends = ? WHERE id = ?',
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
    const upgradeUrl = getSettings().upgrade_url;
    await this.emailService.sendTrialExpirationEmail(email, licenseKey, expiryDate, daysLeft, upgradeUrl);
  }

  async sendGracePeriodNotification(email, gracePeriodEnds) {
    const graceDate = new Date(gracePeriodEnds).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const upgradeUrl = getSettings().upgrade_url;
    await this.emailService.sendGracePeriodEmail(email, graceDate, upgradeUrl);
  }
}
