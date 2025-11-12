 
 
import { secureFs } from '../utils/secureFileOps.mjs';
import path from 'path';

export class SubscriptionManager {
  constructor() {
    this.configPath = path.join(process.cwd(), '../../client/c01_client-first-app/config/app.json');
    this.tierAccessPath = path.join(process.cwd(), '../../client/c01_client-first-app/config/tier-access.json');
    this.tierAccessConfig = null;
  }

  async loadTierAccessConfig() {
    if (this.tierAccessConfig) return this.tierAccessConfig;
    
    try {
      const configData = await secureFs.readFile(this.tierAccessPath, 'utf8');
      this.tierAccessConfig = JSON.parse(configData);
      return this.tierAccessConfig;
    } catch (error) {
      console.error('Failed to load tier-access.json, using fallback config:', error);
      // Fallback to hardcoded config if file doesn't exist
      this.tierAccessConfig = this.getFallbackConfig();
      return this.tierAccessConfig;
    }
  }

  getFallbackConfig() {
    return {
      tiers: {
        1: { name: 'standard', features: { canModifyDocIndex: false, canChangeModelParams: false } },
        2: { name: 'premium', features: { canModifyDocIndex: true, canChangeModelParams: true } },
        3: { name: 'professional', features: { canModifyDocIndex: true, canChangeModelParams: true } }
      },
      config: { enabled: true, defaultTier: 1 }
    };
  }

  async getSubscriptionTier() {
    try {
      const configData = await secureFs.readFile(this.configPath, 'utf8');
      const config = JSON.parse(configData);
      return config['subscription-tier'] || 1;
    } catch (error) {
      return 1;
    }
  }

  async getTierName(tier) {
    const config = await this.loadTierAccessConfig();
    return config.tiers[tier]?.name || 'standard';
  }

  async getTierFeatures(tier) {
    const config = await this.loadTierAccessConfig();
    const tierConfig = config.tiers[tier] || config.tiers[1];
    
    return {
      name: tierConfig.displayName || tierConfig.name,
      price: tierConfig.price,
      computers: tierConfig.computers,
      menuItems: tierConfig.menuItems,
      ...tierConfig.features,
      codeEmailFrequency: tierConfig.codeEmailFrequency
    };
  }

  async checkFeatureAccess(featureName, userRole = 'searcher') {
    const config = await this.loadTierAccessConfig();
    
    if (!config.config.enabled) {
      return true; // If tier access is disabled, allow everything
    }
    
    const tier = await this.getSubscriptionTier();
    const featureGate = config.featureGates[featureName];
    
    if (!featureGate) {
      return true; // If feature not defined, allow by default
    }
    
    // Check tier requirement
    if (featureGate.requiredTier && tier < featureGate.requiredTier) {
      return false;
    }
    
    // Check role requirement
    if (featureGate.requiredRole && userRole !== featureGate.requiredRole) {
      return false;
    }
    
    return true;
  }

  async getAccessMatrix(tier, role) {
    const config = await this.loadTierAccessConfig();
    const tierName = await this.getTierName(tier);
    return config.accessMatrix[tierName]?.[role] || { menuAccess: [], features: [], restrictions: [] };
  }

  async getCSSClassMapping(tier, role) {
    const config = await this.loadTierAccessConfig();
    const tierName = await this.getTierName(tier);
    
    return {
      tierClasses: config.cssClassMapping['tier-based'][tierName] || { show: [], hide: [] },
      roleClasses: config.cssClassMapping['role-based'][role] || { show: [], hide: [] }
    };
  }
}