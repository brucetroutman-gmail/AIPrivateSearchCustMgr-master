import express from 'express';
import { initializeLicensingDB, getDB } from '../lib/licensing-db.mjs';

const router = express.Router();

// Debug endpoint to test database connection
router.get('/debug-db', async (req, res) => {
  try {
    console.log('Debug: Initializing database...');
    await initializeLicensingDB();
    
    console.log('Debug: Getting database connection...');
    const db = getDB();
    
    console.log('Debug: Testing query...');
    const [customers] = await db.execute(
      'SELECT id, email, email_verified FROM customers WHERE email = ?',
      ['bruce.troutman@gmail.com']
    );
    
    console.log('Debug: Query result:', customers);
    
    res.json({
      success: true,
      customers: customers,
      message: 'Database connection working'
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

export default router;