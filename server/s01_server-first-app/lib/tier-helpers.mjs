import { getSettings } from './settings-loader.mjs';

function getTierName(tier) {
  const names = { 1: 'standard', 2: 'premium', 3: 'professional' };
  return names[tier] || 'standard';
}

function getTierFeatures(tier) {
  const features = {
    1: ['search', 'collections'],
    2: ['search', 'multi-mode', 'collections', 'models'],
    3: ['search', 'multi-mode', 'collections', 'models', 'config', 'doc-index']
  };
  return features[tier] || features[1];
}

function getMaxDevices(tier) {
  const limits = getSettings().device_limits;
  const map = { 1: limits.standard, 2: limits.premium, 3: limits.professional };
  return map[tier] || limits.standard;
}

export { getTierName, getTierFeatures, getMaxDevices };
