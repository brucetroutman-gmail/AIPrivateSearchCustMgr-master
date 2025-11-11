// Common Line Search result formatting utility
// Note: Requires highlightRenderer.js to be loaded

// Convert markdown to HTML with safe link handling
function convertMarkdownToHTML(markdown) {
    // Don't decode HTML entities to preserve search highlighting marks
    const lines = markdown.split('\n');
    let html = '';
    let inList = false;
    
    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        
        // Handle headers
        if (trimmedLine.startsWith('## ')) {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<h3>${trimmedLine.substring(3)}</h3>`;
            return;
        }
        if (trimmedLine.startsWith('### ')) {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<h4>${trimmedLine.substring(4)}</h4>`;
            return;
        }
        
        // Handle numbered lists
        if (trimmedLine.match(/^\d+\. /)) {
            if (!inList) { html += '<ol>'; inList = 'ol'; }
            else if (inList === 'ul') { html += '</ul><ol>'; inList = 'ol'; }
            const listText = trimmedLine.replace(/^\d+\. /, '');
            html += `<li>${processInlineMarkdown(listText)}</li>`;
            return;
        }
        
        // Handle bullet lists
        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
            if (!inList) { html += '<ul>'; inList = 'ul'; }
            else if (inList === 'ol') { html += '</ol><ul>'; inList = 'ul'; }
            const listText = trimmedLine.substring(2);
            html += `<li>${processInlineMarkdown(listText)}</li>`;
            return;
        }
        
        // Close list if we're not in a list item
        if (inList && !trimmedLine.match(/^\d+\. /) && !trimmedLine.startsWith('- ') && !trimmedLine.startsWith('* ')) {
            html += inList === 'ol' ? '</ol>' : '</ul>';
            inList = false;
        }
        
        // Handle separators
        if (trimmedLine === '---') {
            html += '<hr class="result-separator" style="margin: 1rem 0;">';
            return;
        }
        
        // Handle empty lines
        if (trimmedLine === '') {
            html += '<br>';
            return;
        }
        
        // Handle regular paragraphs
        html += processInlineMarkdown(line);
        
        // Add line break after each line (except the last one)
        if (index < lines.length - 1) {
            html += '<br>';
        }
    });
    
    // Close any open lists
    if (inList) {
        html += inList === 'ol' ? '</ol>' : '</ul>';
    }
    
    return html;
}

// Process inline markdown elements
function processInlineMarkdown(text) {
    // Handle markdown links
    text = text.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" class="filename-link">$1</a>');
    
    // Handle bold text (but not if it's a full line header)
    if (!text.trim().startsWith('**') || !text.trim().endsWith('**') || text.includes(' ')) {
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    } else if (text.trim().startsWith('**') && text.trim().endsWith('**')) {
        // Full line bold (header)
        const boldText = text.trim().substring(2, text.trim().length - 2);
        return `<strong>${boldText}</strong>`;
    }
    
    // Handle italic text
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Handle code spans
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    return text;
}

// Format Line Search results using common formatter
function formatLineSearchResults(results) {
    return CommonResultFormatter.formatSearchResults(results, {
        resultType: 'line-search',
        showScore: true,
        defaultCollection: 'default'
    });
}

// Export functions for use in other modules
window.lineSearchFormatter = {
    convertMarkdownToHTML,
    formatLineSearchResults,
    processInlineMarkdown
};