// Unified parameter management utility
class ParameterManager {
  constructor() {
    this.parameters = {};
  }

  // Load configuration from JSON files
  async loadConfig(configFile) {
    try {
      const response = await fetch(`./config/${configFile}`);
      return await response.json();
    } catch (error) {
      console.error(`Failed to load ${configFile}:`, error);
      return {};
    }
  }

  // Setup parameter persistence for multiple elements
  setupPersistence(elementConfigs) {
    elementConfigs.forEach(config => {
      const element = document.getElementById(config.elementId);
      if (!element) return;

      // Restore saved value
      const savedValue = localStorage.getItem(config.storageKey);
      if (savedValue) {
        element.value = savedValue;
      }

      // Save on change
      element.addEventListener('change', () => {
        localStorage.setItem(config.storageKey, element.value);
      });
    });
  }

  // Load and populate parameter selects
  async loadParameterSelects() {
    const [tempData, contextData, tokensData] = await Promise.all([
      this.loadConfig('temperature.json'),
      this.loadConfig('context.json'),
      this.loadConfig('tokens.json')
    ]);

    this.populateParameterSelect('temperature', tempData.temperature, 'value', 'name', 'lastTemperature');
    this.populateParameterSelect('context', contextData.context, 'name', 'name', 'lastContext');
    this.populateParameterSelect('tokens', tokensData.tokens, 'name', 'name', 'lastTokens');
  }

  populateParameterSelect(elementId, options, valueKey, textKey, storageKey) {
    const element = document.getElementById(elementId);
    if (!element || !options) return;

    element.textContent = '';
    options.forEach(option => {
      const optionEl = document.createElement('option');
      optionEl.value = option[valueKey] || option;
      optionEl.textContent = option[textKey] || option;
      element.appendChild(optionEl);
    });

    const savedValue = localStorage.getItem(storageKey);
    if (savedValue) {
      element.value = savedValue;
    }

    element.addEventListener('change', () => {
      localStorage.setItem(storageKey, element.value);
    });
  }
}

// Create global instance
window.parameterManager = new ParameterManager();