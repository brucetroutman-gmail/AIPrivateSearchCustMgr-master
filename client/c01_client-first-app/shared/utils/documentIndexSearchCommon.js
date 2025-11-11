// Common document index search functionality for both search and multi-mode pages
// Note: Requires highlightRenderer.js to be loaded

window.documentIndexSearchCommon = {
    // Perform document index search
    async performDocumentIndexSearch(query, collection) {
        const startTime = Date.now();
        
        try {
            const response = await window.csrfManager.fetch(`${window.API_BASE_URL}/api/multi-search/document-index`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, options: { collection } })
            });
            
            const data = await response.json();
            return { 
                results: data.results || [], 
                time: Date.now() - startTime, 
                method: 'document-index' 
            };
        } catch (error) {
            console.error('Document index search error:', error);
            return { results: [], time: Date.now() - startTime, method: 'document-index' };
        }
    },

    // Format document index search results using common formatter
    formatDocumentIndexSearchResults(results, collection = 'default') {
        return CommonResultFormatter.formatSearchResults(results, {
            resultType: 'document-index',
            showScore: true,
            defaultCollection: collection
        });
    }
};