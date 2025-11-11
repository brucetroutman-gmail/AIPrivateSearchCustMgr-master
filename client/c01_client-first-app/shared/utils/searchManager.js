// Unified search management utility
class SearchManager {
  constructor() {
    this.models = [];
    this.collections = [];
  }

  // Load models from config
  async loadModels(category = 'search') {
    try {
      const response = await fetch('config/models-list.json');
      const data = await response.json();
      this.models = data.models.filter(m => m.category === category).map(m => m.modelName).sort();
      return this.models;
    } catch (error) {
      console.error('Failed to load models:', error);
      return [];
    }
  }

  // Load collections
  async loadCollections() {
    try {
      const response = await window.csrfManager.fetch(`${window.API_BASE_URL}/api/multi-search/collections`);
      const data = await response.json();
      this.collections = data.collections || [];
      return this.collections;
    } catch (error) {
      console.error('Failed to load collections:', error);
      return [];
    }
  }

  // Populate select element
  populateSelect(elementId, options, storageKey = null, defaultValue = null) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.textContent = '';
    options.forEach(option => {
      const optionEl = document.createElement('option');
      optionEl.value = option;
      optionEl.textContent = option;
      element.appendChild(optionEl);
    });

    const savedValue = storageKey ? localStorage.getItem(storageKey) : null;
    if (savedValue && options.includes(savedValue)) {
      element.value = savedValue;
    } else if (defaultValue && options.includes(defaultValue)) {
      element.value = defaultValue;
    }

    if (storageKey) {
      element.addEventListener('change', () => {
        localStorage.setItem(storageKey, element.value);
      });
    }
  }

  // Unified search execution
  async executeSearch(searchType, query, options = {}) {
    const startTime = Date.now();
    
    try {
      let result;
      switch (searchType) {
        case 'line-search':
          result = await this.performLineSearch(query, options);
          break;
        case 'document-search':
          result = await window.documentSearchCommon.performDocumentSearch(query, options.collection, options.useWildcards);
          break;
        case 'smart-search':
          result = await window.smartSearchCommon.performSmartSearch(query, options.collection, 5);
          break;
        case 'hybrid-search':
          result = await window.hybridSearchCommon.performHybridSearch(query, options.collection, 5);
          break;
        case 'document-index':
          result = await window.documentIndexSearchCommon.performDocumentIndexSearch(query, options.collection);
          break;
        case 'ai-direct':
          result = await window.aiDirectCommon.performAIDirectSearch(query, options.collection, options);
          break;
        case 'ai-document-chat':
          result = await this.performAIDocumentChat(query, options);
          break;
        default:
          throw new Error(`Unknown search type: ${searchType}`);
      }
      
      return { ...result, time: Date.now() - startTime, method: searchType };
    } catch (error) {
      console.error(`${searchType} search error:`, error);
      return { results: [], time: Date.now() - startTime, method: searchType };
    }
  }

  async performLineSearch(query, options) {
    const response = await window.csrfManager.fetch(`${window.API_BASE_URL}/api/multi-search/line-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, options })
    });
    const data = await response.json();
    return { results: data.results || [] };
  }

  async performAIDocumentChat(query, options) {
    const response = await window.csrfManager.fetch(`${window.API_BASE_URL}/api/multi-search/ai-document-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query, 
        options: { 
          collection: options.collection, 
          model: options.model, 
          topK: 3, 
          temperature: options.temperature, 
          contextSize: options.contextSize, 
          tokenLimit: options.tokenLimit 
        } 
      })
    });
    const data = await response.json();
    return { results: data.results || [] };
  }
}

// Create global instance
window.searchManager = new SearchManager();