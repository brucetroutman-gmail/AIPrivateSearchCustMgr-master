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
  const limits = { 1: 2, 2: 5, 3: 10 };
  return limits[tier] || 2;
}

export { getTierName, getTierFeatures, getMaxDevices };
