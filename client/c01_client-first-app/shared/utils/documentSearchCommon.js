// Common document search functionality for both search and multi-mode pages
// Note: Requires highlightRenderer.js to be loaded

class DocumentSearchCommon {
  constructor() {
    this.name = 'DocumentSearchCommon';
  }

  // Perform document search using the document-search endpoint
  async performDocumentSearch(query, collection, useWildcards = false) {
    const startTime = Date.now();
    
    try {
      const response = await window.csrfManager.fetch(`${window.API_BASE_URL}/api/multi-search/document-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query, 
          options: { 
            collection, 
            useWildcards 
          } 
        })
      });
      
      const data = await response.json();
      return { 
        results: data.results || [], 
        time: Date.now() - startTime, 
        method: 'document-search' 
      };
    } catch (error) {
      console.error('Document search error:', error);
      return { results: [], time: Date.now() - startTime, method: 'document-search' };
    }
  }

  // Format document search results using common formatter
  formatDocumentSearchResults(results) {
    return CommonResultFormatter.formatSearchResults(results, {
      resultType: 'document-search',
      showScore: true,
      defaultCollection: 'default'
    });
  }

  // Add document search option to search type dropdown
  addDocumentSearchOption(searchTypeElement) {
    if (!searchTypeElement) return;
    
    // Check if option already exists
    const existingOption = Array.from(searchTypeElement.options).find(opt => opt.value === 'document-search');
    if (existingOption) return;
    
    const option = document.createElement('option');
    option.value = 'document-search';
    option.textContent = 'Document Search';
    searchTypeElement.appendChild(option);
  }

  // Handle document search in search page context
  async handleSearchPageDocumentSearch(query, collection, useWildcards = false) {
    const searchResult = await this.performDocumentSearch(query, collection, useWildcards);
    
    if (!searchResult.results || searchResult.results.length === 0) {
      return 'No relevant documents found using Document Search.';
    }

    // For search page, return formatted text response
    return searchResult.results.map((result, index) => {
      const docLink = result.documentPath ? `[View Document](${result.documentPath})` : '';
      return `**Result ${index + 1}: ${result.title}**\n${result.excerpt.replace(/<[^>]*>/g, '')}\n${docLink}\n`;
    }).join('\n---\n\n');
  }



  // Check if document search is available for current source type
  isDocumentSearchAvailable(sourceType) {
    return sourceType && sourceType.includes('Docu');
  }

  // Get document search display name
  getDisplayName() {
    return 'Document Search';
  }

  // Get document search description
  getDescription() {
    return 'Document-wide search with ranking and Boolean logic';
  }
}

// Create global instance
window.documentSearchCommon = new DocumentSearchCommon();