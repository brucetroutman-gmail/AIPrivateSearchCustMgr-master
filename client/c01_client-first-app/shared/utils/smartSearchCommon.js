// Common Smart Search (vector search) functionality for both search and multi-mode pages

window.smartSearchCommon = {
    // Perform Smart Search using vector similarity
    async performSmartSearch(query, collection, topK = 5) {
        const startTime = Date.now();
        
        try {
            const response = await window.csrfManager.fetch(`${window.API_BASE_URL}/api/multi-search/smart-search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, options: { collection, topK } })
            });
            
            const data = await response.json();
            return { 
                results: data.results || [], 
                time: Date.now() - startTime, 
                method: 'smart-search' 
            };
        } catch (error) {
            console.error('Smart Search error:', error);
            return { results: [], time: Date.now() - startTime, method: 'smart-search' };
        }
    },

    // Convert Smart Search results to search page format
    convertToSearchPageFormat(searchResult, collection) {
        if (!searchResult.results || searchResult.results.length === 0) {
            return {
                response: 'No relevant documents found using Smart Search.',
                searchType: 'smart-search',
                collection
            };
        }

        // Format results as markdown with relevance explanations
        const responseText = searchResult.results.map((result, index) => {
            // Handle null/undefined scores
            const score = result.score || 0.5; // Default to 50% if no score
            const percentage = Math.round(score * 100);
            const title = result.title || `Result ${index + 1}`;
            
            // Extract relevance explanation from excerpt if present
            let relevanceExplanation = '';
            let cleanExcerpt = result.excerpt;
            
            if (result.excerpt && result.excerpt.includes('<strong>') && result.excerpt.includes('% match</strong>')) {
                const parts = result.excerpt.split('<br><br>');
                if (parts.length >= 2) {
                    relevanceExplanation = parts[0].replace(/<[^>]*>/g, ''); // Strip HTML tags
                    cleanExcerpt = parts.slice(1).join('\n\n');
                }
            } else {
                // Create relevance explanation if not present
                relevanceExplanation = `${percentage}% match - Conceptually similar content`;
            }
            
            let formattedResult = `**Result ${index + 1}: ${title}**\n`;
            if (relevanceExplanation) {
                formattedResult += `${relevanceExplanation}\n\n`;
            }
            formattedResult += `${cleanExcerpt}`;
            
            return formattedResult;
        }).join('\n\n---\n\n');

        return {
            response: responseText,
            searchType: 'smart-search',
            collection,
            results: searchResult.results.map(r => ({ ...r, score: r.score || 0.5 })) // Ensure scores are valid
        };
    }
};