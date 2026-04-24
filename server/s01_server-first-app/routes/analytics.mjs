import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.mjs';
import pool from '../lib/database/connection.mjs';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const conn = await pool.getConnection();

    const [[customerStats]] = await conn.execute(`
      SELECT
        COUNT(*) as total,
        SUM(email_verified = 1) as verified,
        SUM(email_verified = 0) as unverified,
        SUM(active = 1 AND email_verified = 1) as active,
        SUM(active = 0) as inactive,
        SUM(DATE(created_at) = CURDATE()) as new_today,
        SUM(created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as new_this_week,
        SUM(created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as new_this_month
      FROM customers
    `);

    const [[licenseStats]] = await conn.execute(`
      SELECT
        SUM(license_status = 'trial') as trial,
        SUM(license_status = 'active') as active,
        SUM(license_status = 'expired') as expired,
        SUM(license_status = 'suspended') as suspended,
        SUM(license_status = 'cancelled') as cancelled,
        SUM(expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY) AND license_status IN ('trial','active')) as expiring_7_days,
        SUM(expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY) AND license_status IN ('trial','active')) as expiring_30_days
      FROM customers
      WHERE email_verified = 1
    `);

    const [tierStats] = await conn.execute(`
      SELECT
        CASE tier WHEN 1 THEN 'Standard' WHEN 2 THEN 'Premium' WHEN 3 THEN 'Professional' ELSE 'Unknown' END as tier_name,
        COUNT(*) as count
      FROM customers
      WHERE email_verified = 1
      GROUP BY tier
      ORDER BY tier
    `);

    const [[deviceStats]] = await conn.execute(`
      SELECT
        COUNT(*) as total_devices,
        COUNT(DISTINCT customer_id) as customers_with_devices,
        ROUND(COUNT(*) / NULLIF(COUNT(DISTINCT customer_id), 0), 1) as avg_per_customer
      FROM devices
      WHERE status = 'active'
    `);

    const [customersAtLimit] = await conn.execute(`
      SELECT COUNT(*) as count
      FROM (
        SELECT c.id,
          CASE c.tier WHEN 1 THEN 2 WHEN 2 THEN 5 WHEN 3 THEN 10 ELSE 2 END as max_devices,
          COUNT(d.id) as device_count
        FROM customers c
        LEFT JOIN devices d ON c.id = d.customer_id AND d.status = 'active'
        WHERE c.email_verified = 1
        GROUP BY c.id, c.tier
        HAVING device_count >= max_devices
      ) as at_limit
    `);

    const [registrationsByDay] = await conn.execute(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM customers
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    const [topStates] = await conn.execute(`
      SELECT state, COUNT(*) as count
      FROM customers
      WHERE state IS NOT NULL AND state != '' AND email_verified = 1
      GROUP BY state
      ORDER BY count DESC
      LIMIT 10
    `);

    conn.release();

    res.json({
      customers: customerStats,
      licenses: licenseStats,
      tiers: tierStats,
      devices: {
        ...deviceStats,
        customers_at_limit: customersAtLimit[0].count
      },
      registrations_by_day: registrationsByDay,
      top_states: topStates
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

export default router;
