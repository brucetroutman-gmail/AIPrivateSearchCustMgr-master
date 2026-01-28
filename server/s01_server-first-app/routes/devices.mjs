import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.mjs';
import pool from '../lib/database/connection.mjs';

const router = express.Router();

// Delete device (customer can delete own devices, admin/manager can delete any)
router.delete('/:deviceId', requireAuth, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const connection = await pool.getConnection();
    
    // Get device to check ownership
    const [devices] = await connection.execute(
      'SELECT customer_id FROM devices WHERE id = ?',
      [deviceId]
    );
    
    if (devices.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const device = devices[0];
    const isAdmin = ['admin', 'manager'].includes(req.user.userRole);
    const isOwner = req.user.userType === 'customer' && req.user.id == device.customer_id;
    
    if (!isAdmin && !isOwner) {
      connection.release();
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Delete device
    await connection.execute('DELETE FROM devices WHERE id = ?', [deviceId]);
    connection.release();
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
