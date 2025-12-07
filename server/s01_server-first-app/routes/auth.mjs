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

// Register new user (admin only)
router.post('/register', requireAuth, async (req, res) => {
  try {
    if (req.user.userRole !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { email, password, userRole = 'manager' } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await userManager.createUser(email, password, userRole);
    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all users (admin only)
router.get('/users', requireAuth, async (req, res) => {
  try {
    if (req.user.userRole !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const users = await userManager.getAllUsers();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user
router.put('/users/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { userRole, isActive, password, email } = req.body;
    
    const updates = {};
    const isAdmin = req.user.userRole === 'admin';
    const isOwnProfile = req.user.id == userId;
    
    // Check permissions
    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Admins can update everything
    if (isAdmin) {
      if (userRole) updates.userRole = userRole;
      if (typeof isActive === 'boolean') updates.isActive = isActive;
      if (email) updates.email = email;
      if (password) updates.password = password;
    } 
    // Users can update their own email and password
    else if (isOwnProfile) {
      if (email) updates.email = email;
      if (password) updates.password = password;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }
    
    const user = await userManager.updateUser(userId, updates);
    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete user (admin only)
router.delete('/users/:userId', requireAuth, async (req, res) => {
  try {
    if (req.user.userRole !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { userId } = req.params;
    await userManager.deleteUser(userId);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;