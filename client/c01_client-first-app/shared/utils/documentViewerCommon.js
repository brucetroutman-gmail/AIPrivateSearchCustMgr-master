// Common document viewer utility for all search types

window.documentViewerCommon = {
    // Generate document viewer URL with optional line number and search term
    generateDocumentUrl(collection, filename, options = {}) {
        const { lineNumber, searchTerm } = options;
        let url = `${window.API_BASE_URL}/api/documents/${collection}/${filename}/view`;
        
        const params = new URLSearchParams();
        if (lineNumber) {
            params.append('line', lineNumber);
        }
        if (searchTerm) {
            params.append('search', searchTerm);
        }
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        return url;
    },

    // Create a standardized View Document link
    createViewDocumentLink(collection, filename, options = {}) {
        const url = this.generateDocumentUrl(collection, filename, options);
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.className = 'view-document-link';
        link.textContent = 'View Document';
        return link;
    },

    // Create View Document link for markdown format
    createViewDocumentMarkdown(collection, filename, options = {}) {
        const url = this.generateDocumentUrl(collection, filename, options);
        return `[View Document](${url})`;
    }
};