/**
 * Tier Access Manager - Client-side utility for role and tier-based access control
 */

class TierAccessManager {
  constructor() {
    this.config = null;
    this.configPath = './config/tier-access.json';
  }

  async loadConfig() {
    if (this.config) return this.config;
    
    try {
      const response = await fetch(`${window.API_BASE_URL}/api/config/tier-access.json`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      this.config = JSON.parse(data.content);
      return this.config;
    } catch (error) {
      console.error('Failed to load tier-access.json:', error);
      // Return minimal fallback config
      this.config = {
        config: { enabled: false },
        userTypes: { 'standard-searcher': { tier: 1, tierName: 'standard', role: 'searcher' } }
      };
      return this.config;
    }
  }

  async isEnabled() {
    const config = await this.loadConfig();
    return config.config?.enabled || false;
  }

  async getUserTypeInfo(tier, role) {
    const config = await this.loadConfig();
    const tierNames = { 1: 'standard', 2: 'premium', 3: 'professional' };
    const tierName = tierNames[tier] || 'standard';
    const userTypeKey = `${tierName}-${role}`;
    return config.userTypes[userTypeKey] || config.userTypes['standard-searcher'];
  }

  async checkFeatureAccess(featureName, tier, role) {
    const config = await this.loadConfig();
    
    if (!config.config.enabled) {
      return true; // If disabled, allow everything
    }

    const featureGate = config.featureGates[featureName];
    if (!featureGate) {
      return true; // If not defined, allow by default
    }

    // Check tier requirement
    if (featureGate.requiredTier && tier < featureGate.requiredTier) {
      return false;
    }

    // Check role requirement  
    if (featureGate.requiredRole && role !== featureGate.requiredRole) {
      return false;
    }

    return true;
  }

  async getAccessMatrix(tier, role) {
    const userType = await this.getUserTypeInfo(tier, role);
    return {
      menuAccess: userType.menuAccess || [],
      features: userType.features || [],
      restrictions: userType.restrictions || []
    };
  }

  async applyCSSClasses(tier, role) {
    const config = await this.loadConfig();
    
    if (!config.config.enabled) {
      return;
    }

    const userType = await this.getUserTypeInfo(tier, role);
    
    // Show elements
    (userType.cssShow || []).forEach(className => {
      document.querySelectorAll(className).forEach(el => {
        el.style.display = '';
      });
    });

    // Hide elements
    (userType.cssHide || []).forEach(className => {
      document.querySelectorAll(className).forEach(el => {
        el.style.display = 'none';
      });
    });
  }

  async getMenuItems(tier, role) {
    const accessMatrix = await this.getAccessMatrix(tier, role);
    return accessMatrix.menuAccess;
  }

  async getFeatures(tier, role) {
    const accessMatrix = await this.getAccessMatrix(tier, role);
    return accessMatrix.features;
  }

  async getRestrictions(tier, role) {
    const accessMatrix = await this.getAccessMatrix(tier, role);
    return accessMatrix.restrictions;
  }

  async logAccessAttempt(featureName, tier, role, allowed) {
    const config = await this.loadConfig();
    
    if (config.config.logAccessAttempts) {
      console.log(`Access attempt: ${featureName} | Tier: ${tier} | Role: ${role} | Allowed: ${allowed}`);
    }
  }

  // Utility method to get current user's tier and role
  getCurrentUserInfo() {
    const tierMap = { 'standard': 1, 'premium': 2, 'professional': 3 };
    const userRole = localStorage.getItem('userRole') || 'professional';
    const userUserRole = localStorage.getItem('userUserRole') || 'admin';
    
    return {
      tier: tierMap[userRole] || 3,
      role: userUserRole,
      tierName: userRole
    };
  }

  // Apply access control to current page
  async applyAccessControl() {
    const userInfo = this.getCurrentUserInfo();
    await this.applyCSSClasses(userInfo.tier, userInfo.role);
  }
}

// Create global instance
const tierAccessManager = new TierAccessManager();

// Make available globally
if (typeof window !== 'undefined') {
  window.tierAccessManager = tierAccessManager;
}

export default tierAccessManager;