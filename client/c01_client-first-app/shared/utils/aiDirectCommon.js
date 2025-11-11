// Common AI Direct search functionality

const aiDirectCommon = {
  // Perform AI Direct search
  async performAIDirectSearch(query, collection, options = {}) {
    const response = await window.csrfManager.fetch(`${window.API_BASE_URL}/api/multi-search/ai-direct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query, 
        options: { 
          collection, 
          model: options.model,
          temperature: options.temperature,
          contextSize: options.contextSize,
          tokenLimit: options.tokenLimit
        } 
      })
    });
    
    const data = await response.json();
    return {
      results: data.results || [],
      searchType: 'ai-direct',
      query,
      collection
    };
  },

  // Format AI Direct results for display
  formatAIDirectResults(results, searchData = {}) {
    if (!results || results.length === 0) {
      return 'No AI Direct results found';
    }

    let formattedResults = '';
    
    // Separate matches from no-matches
    const matches = results.filter(r => r.hasMatch !== false && !r.excerpt.startsWith('NO_MATCH:'));
    const noMatches = results.filter(r => r.hasMatch === false || r.excerpt.startsWith('NO_MATCH:'));
    
    // Add summary header
    if (matches.length > 0 || noMatches.length > 0) {
      formattedResults += `## AI Document Analysis Results\n\n`;
      if (matches.length > 0) {
        formattedResults += `**📋 Documents with relevant information: ${matches.length}**\n\n`;
      }
    }
    
    // Format matching documents first
    if (matches.length > 0) {
      matches.forEach((result, index) => {
        formattedResults += `### ${index + 1}. ${result.title.replace(' (No Match)', '')}\n\n`;
        formattedResults += `${result.excerpt}\n\n`;
        formattedResults += `*Source: ${result.source}*\n\n---\n\n`;
      });
    }
    
    // Format no-match documents
    if (noMatches.length > 0) {
      formattedResults += `**📄 Documents with no relevant information: ${noMatches.length}**\n\n`;
      noMatches.forEach((result, index) => {
        const cleanTitle = result.title.replace(' (No Match)', '');
        const cleanExcerpt = result.excerpt.replace(/^NO_MATCH:\s*/, '');
        formattedResults += `- **${cleanTitle}**: ${cleanExcerpt}\n`;
      });
    }
    
    return formattedResults;
  },

  // Handle AI Direct search for search page
  async handleSearchPageAIDirectSearch(query, collection, options = {}) {
    try {
      const searchResult = await this.performAIDirectSearch(query, collection, options);
      const formattedResults = this.formatAIDirectResults(searchResult.results, {
        matchCount: searchResult.matchCount,
        noMatchCount: searchResult.noMatchCount,
        total: searchResult.total
      });
      
      return {
        response: formattedResults,
        searchType: 'ai-direct',
        query: searchResult.query,
        collection: searchResult.collection,
        createdAt: new Date().toISOString(),
        matchCount: searchResult.matchCount,
        noMatchCount: searchResult.noMatchCount
      };
    } catch (error) {
      throw new Error(`AI Direct search failed: ${error.message}`);
    }
  }
};

// Make available globally
window.aiDirectCommon = aiDirectCommon;