import express from 'express';
import { UserManager } from '../lib/auth/userManager.mjs';
import { requireAuth } from '../middleware/authMiddleware.mjs';

const router = express.Router();
const userManager = new UserManager();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await userManager.authenticateUser(email, password);
    const sessionId = await userManager.createSession(user.id);
    
    res.json({ success: true, user, sessionId });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Logout endpoint
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const sessionId = req.headers.authorization?.replace('Bearer ', '') || 
                     req.cookies?.sessionId;
    
    if (sessionId) {
      await userManager.deleteSession(sessionId);
    }
    
    res.clearCookie('sessionId');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user endpoint
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;