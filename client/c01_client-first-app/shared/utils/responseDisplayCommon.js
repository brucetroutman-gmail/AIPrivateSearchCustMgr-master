// Common response display functionality for both search and multi-mode pages

window.responseDisplayCommon = {
    // Render search results using multi-mode format
    renderSearchResults(container, searchResult, collection = null) {
        if (!searchResult.results || searchResult.results.length === 0) {
            const noResultsDiv = document.createElement('div');
            noResultsDiv.className = 'no-results';
            noResultsDiv.textContent = 'No results found';
            container.textContent = '';
            container.appendChild(noResultsDiv);
            return;
        }
        
        container.textContent = '';
        
        // Use existing formatters for specific search types
        if (searchResult.method === 'line-search') {
            const formattedElement = window.lineSearchFormatter.formatLineSearchResults(searchResult.results);
            container.appendChild(formattedElement);
            return;
        }
        
        if (searchResult.method === 'document-search') {
            const formattedElement = window.documentSearchCommon.formatDocumentSearchResults(searchResult.results);
            container.appendChild(formattedElement);
            return;
        }
        
        if (searchResult.method === 'document-index') {
            const formattedElement = window.documentIndexSearchCommon.formatDocumentIndexSearchResults(searchResult.results, collection);
            container.appendChild(formattedElement);
            return;
        }
        
        // Use common formatter for AI Direct to ensure consistent filename links
        if (searchResult.method === 'ai-direct') {
            const formattedElement = window.CommonResultFormatter.formatSearchResults(searchResult.results, {
                resultType: 'ai-direct',
                showScore: true,
                defaultCollection: collection || 'default'
            });
            container.appendChild(formattedElement);
            return;
        }
        
        // Format other search types with consistent styling
        searchResult.results.forEach((result) => {
            const div = document.createElement('div');
            div.className = 'result-item';
            
            const header = document.createElement('div');
            header.className = 'result-header';
            
            const title = document.createElement('h4');
            title.textContent = result.title;
            
            const score = document.createElement('span');
            score.className = 'score';
            score.textContent = `${Math.round(result.score * 100)}%`;
            
            header.appendChild(title);
            header.appendChild(score);
            
            const excerpt = document.createElement('div');
            excerpt.className = 'result-excerpt';
            
            // Handle markdown conversion for AI-based searches
            if (searchResult.method === 'smart-search' || searchResult.method === 'hybrid-search' || searchResult.method === 'ai-document-chat') {
                const sanitizedHTML = window.lineSearchFormatter.convertMarkdownToHTML(result.excerpt);
                const parser = new DOMParser();
                const doc = parser.parseFromString(sanitizedHTML, 'text/html');
                while (doc.body.firstChild) {
                    excerpt.appendChild(doc.body.firstChild);
                }
            } else {
                excerpt.textContent = result.excerpt;
            }
            
            div.appendChild(header);
            div.appendChild(excerpt);
            
            // Add metadata section (no View Document links since filenames are clickable)
            const meta = document.createElement('div');
            meta.className = 'result-meta';
            
            div.appendChild(meta);
            container.appendChild(div);
        });
    },

    // Convert search result to multi-mode format
    convertToMultiModeFormat(result, searchType) {
        if (!result.response) return { results: [], method: searchType };
        
        // Parse markdown-formatted responses into result objects
        if (result.response.includes('**Result ') && result.response.includes('---')) {
            const sections = result.response.split('---').filter(s => s.trim());
            const results = sections.map((section, index) => {
                const lines = section.trim().split('\n');
                const titleLine = lines.find(line => line.startsWith('**Result '));
                
                let title = `Result ${index + 1}`;
                let source = 'AI Response';
                
                if (titleLine) {
                    const cleanTitle = titleLine.replace(/\*\*Result \d+: /, '').replace(/\*\*$/, '');
                    // Extract filename from markdown link if present
                    const linkMatch = cleanTitle.match(/\[([^\]]+)\]\(([^\)]+)\)/);
                    if (linkMatch) {
                        title = linkMatch[1]; // Link text becomes title
                        // Extract filename from URL path
                        const urlPath = linkMatch[2];
                        const pathParts = urlPath.split('/');
                        source = decodeURIComponent(pathParts[pathParts.length - 2]); // Filename before /view
                    } else {
                        title = cleanTitle;
                    }
                }
                
                const excerpt = lines.slice(1).join('\n').trim();
                
                return {
                    title,
                    excerpt,
                    score: 1.0,
                    source
                };
            });
            
            return { results, method: searchType };
        }
        
        // Handle single response
        return {
            results: [{
                title: 'Response',
                excerpt: result.response,
                score: 1.0,
                source: 'AI Response'
            }],
            method: searchType
        };
    }
};