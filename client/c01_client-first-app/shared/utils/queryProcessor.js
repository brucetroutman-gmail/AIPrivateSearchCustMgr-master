// Query processor for converting phrases to keywords for exact match searches

class QueryProcessor {
  static extractKeywords(query) {
    // Convert to lowercase for processing
    const lowerQuery = query.toLowerCase().trim();
    
    // Remove common question words and phrases
    const stopWords = [
      'which', 'what', 'who', 'where', 'when', 'why', 'how',
      'are', 'is', 'have', 'has', 'do', 'does', 'did',
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'
    ];
    
    // Split into words and filter out stop words
    const words = lowerQuery
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    // Convert multiple keywords to OR search for better matching
    return words.length > 1 ? words.join(' OR ') : words[0] || query;
  }
  
  static shouldProcessQuery(query) {
    // Process if query contains question words or is longer than 2 words
    const questionWords = ['which', 'what', 'who', 'where', 'when', 'why', 'how'];
    const lowerQuery = query.toLowerCase();
    
    return questionWords.some(word => lowerQuery.includes(word)) || 
           query.trim().split(/\s+/).length > 2;
  }
}

// Make available globally
window.QueryProcessor = QueryProcessor;