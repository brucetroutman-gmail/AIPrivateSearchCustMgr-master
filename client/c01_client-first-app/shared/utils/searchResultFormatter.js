// Common search result formatting utility

class SearchResultFormatter {
  constructor() {
    this.name = 'SearchResultFormatter';
  }

  // Format search results for text-based display (search page)
  formatResultsAsText(results, searchType) {
    if (!results || results.length === 0) {
      return 'No results found.';
    }

    return results.map((result, index) => {
      const docLink = result.documentPath ? `[View Document](${result.documentPath})` : '';
      // Preserve HTML for document-search to maintain highlighting
      const excerpt = searchType === 'document-search' ? result.excerpt : result.excerpt;
      return `**Result ${index + 1}: ${result.title}**\n${excerpt}\n${docLink}\n`;
    }).join('\n---\n\n');
  }

  // Format search results for HTML display (multi-mode page) - safe DOM creation
  formatResultsAsHTML(results, searchType) {
    const container = document.createElement('div');
    
    if (!results || results.length === 0) {
      container.className = 'no-results';
      container.textContent = 'No results found';
      return container;
    }

    if (searchType === 'line-search') {
      return window.lineSearchFormatter.formatLineSearchResults(results);
    }

    if (searchType === 'document-search') {
      return window.documentSearchCommon.formatDocumentSearchResults(results);
    }

    // Standard formatting for other search types
    container.className = 'search-results';
    results.forEach((result, index) => {
      const item = document.createElement('div');
      item.className = 'result-item';
      
      const header = document.createElement('div');
      header.className = 'result-header';
      
      const title = document.createElement('h4');
      title.textContent = result.title || '';
      
      const score = document.createElement('span');
      score.className = 'score';
      score.textContent = `${Math.round((result.score || 0) * 100)}%`;
      
      header.appendChild(title);
      header.appendChild(score);
      
      const excerpt = document.createElement('div');
      excerpt.className = 'result-excerpt';
      excerpt.textContent = result.excerpt || '';
      
      const meta = document.createElement('div');
      meta.className = 'result-meta';
      
      const source = document.createElement('span');
      source.className = 'source';
      source.textContent = result.source || '';
      meta.appendChild(source);
      
      if (result.documentPath) {
        const link = document.createElement('a');
        link.href = result.documentPath;
        link.target = '_blank';
        link.className = 'view-document-link';
        link.textContent = 'View Document';
        meta.appendChild(link);
      }
      
      item.appendChild(header);
      item.appendChild(excerpt);
      item.appendChild(meta);
      container.appendChild(item);
    });
    
    return container;
  }
}

// Create global instance
window.searchResultFormatter = new SearchResultFormatter();