 
 
import { UnifiedUserManager } from '../lib/auth/unifiedUserManager.mjs';

const userManager = new UnifiedUserManager();

export async function requireAuth(req, res, next) {
  try {
    console.log('Auth headers:', req.headers.authorization);
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    console.log('Extracted sessionId:', sessionId);
    
    if (!sessionId) {
      console.log('No sessionId found');
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await userManager.validateSession(sessionId);
    console.log('Validated user:', user ? user.email : 'null');
    if (!user) {
      console.log('User validation failed');
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log('Auth error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

export function requireRole(roles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has required subscription tier or user role
    const hasAccess = roles.some(role => {
      if (['standard', 'premium', 'professional'].includes(role)) {
        return req.user.subscriptionTier === role;
      }
      if (['admin', 'searcher'].includes(role)) {
        return req.user.userRole === role;
      }
      return false;
    });

    if (!hasAccess) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}