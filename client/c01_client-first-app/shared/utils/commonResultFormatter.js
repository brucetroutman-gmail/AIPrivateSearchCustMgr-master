// Common result formatter for Line Search, Document Search, and Document Index Search

class CommonResultFormatter {
  // Format search results with consistent structure
  static formatSearchResults(results, options = {}) {
    const { 
      resultType = 'search',
      showScore = true,
      defaultCollection = 'default'
    } = options;
    
    const container = document.createElement('div');
    
    if (!results || results.length === 0) {
      container.className = 'no-results';
      container.textContent = 'No results found';
      return container;
    }

    container.className = `${resultType}-results`;
    
    results.forEach((result, index) => {
      const item = document.createElement('div');
      item.className = 'result-item';
      
      const header = document.createElement('div');
      header.className = 'result-header';
      
      const title = document.createElement('h4');
      
      // Create filename link if available
      if (result.title && window.documentViewerCommon) {
        const collection = result.collection || defaultCollection;
        let filename = result.source || result.filename || result.title;
        
        // Extract line number from excerpt or source
        let lineNumber = null;
        
        // For Line Search results, extract filename from source (removes :lineNumber)
        if (filename && filename.includes(':')) {
          const parts = filename.split(':');
          filename = parts[0];
          lineNumber = parts[1];
        }
        
        // Try to extract line number from excerpt (format: "123: content")
        if (!lineNumber && result.excerpt) {
          const lineMatch = result.excerpt.match(/^(\d+):\s/);
          if (lineMatch) {
            lineNumber = lineMatch[1];
          }
        }
        
        const resultText = document.createTextNode(`Result ${index + 1}: `);
        title.appendChild(resultText);
        
        const linkOptions = lineNumber ? { lineNumber: parseInt(lineNumber) } : {};
        const filenameLink = window.documentViewerCommon.createViewDocumentLink(collection, filename, linkOptions);
        filenameLink.textContent = result.title;
        filenameLink.className = 'filename-link';
        title.appendChild(filenameLink);
      } else {
        title.textContent = result.title ? 
          `Result ${index + 1}: ${result.title}` : 
          `Result ${index + 1}`;
      }
      
      header.appendChild(title);
      
      if (showScore && result.score !== undefined) {
        const score = document.createElement('span');
        score.className = 'score';
        score.textContent = `${Math.round((result.score || 0) * 100)}%`;
        header.appendChild(score);
      }
      
      const excerpt = document.createElement('div');
      excerpt.className = 'result-excerpt';
      // Use common highlight renderer
      HighlightRenderer.renderHighlightedContent(excerpt, result.excerpt || '');
      
      item.appendChild(header);
      item.appendChild(excerpt);
      container.appendChild(item);
    });
    
    return container;
  }
}

// Make globally available
window.CommonResultFormatter = CommonResultFormatter;