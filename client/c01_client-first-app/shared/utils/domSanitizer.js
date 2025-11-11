// DOM sanitization utility to replace innerHTML usage
class DOMSanitizer {
  // Sanitize text input by removing HTML tags and dangerous characters
  static sanitizeText(input) {
    if (typeof input !== 'string') return '';
    return input
      .replace(/[<>"'&]/g, (match) => {
        const entities = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' };
        return entities[match];
      });
      // Removed .trim() to preserve spaces
  }

  // Sanitize URL input
  static sanitizeURL(url) {
    if (typeof url !== 'string') return '';
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
    } catch {
      return '';
    }
  }

  // Clear element content safely
  static clearElement(element) {
    element.textContent = '';
  }

  // Set text content safely with sanitization
  static setTextContent(element, text) {
    element.textContent = this.sanitizeText(text);
  }

  // Create element with sanitized text content
  static createElement(tagName, textContent = '', className = '') {
    const element = document.createElement(tagName);
    if (textContent) element.textContent = this.sanitizeText(textContent);
    if (className) element.className = this.sanitizeText(className);
    return element;
  }

  // Replace innerHTML with safe DOM creation for simple HTML
  static setHTMLContent(element, htmlString) {
    element.textContent = '';
    
    // For simple cases, create elements directly
    if (htmlString.includes('<div class="error">')) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error';
      errorDiv.textContent = htmlString.replace(/<[^>]*>/g, '');
      element.appendChild(errorDiv);
      return;
    }
    
    if (htmlString.includes('<div class="loading">')) {
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'loading';
      loadingDiv.textContent = htmlString.replace(/<[^>]*>/g, '');
      element.appendChild(loadingDiv);
      return;
    }
    
    // For complex HTML, use DOMParser as last resort
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    while (doc.body.firstChild) {
      element.appendChild(doc.body.firstChild);
    }
  }

  // Create option element safely with sanitization
  static createOption(value, text, selected = false) {
    const option = document.createElement('option');
    option.value = this.sanitizeText(value);
    option.textContent = this.sanitizeText(text);
    if (selected) option.selected = true;
    return option;
  }

  // Sanitize form input values
  static sanitizeFormInput(input) {
    if (!input || typeof input.value !== 'string') return;
    input.value = this.sanitizeText(input.value);
  }

  // Validate and sanitize email
  static sanitizeEmail(email) {
    if (typeof email !== 'string') return '';
    const sanitized = this.sanitizeText(email);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized) ? sanitized : '';
  }

  // Sanitize HTML content allowing only safe highlighting markup
  static sanitizeHTML(html) {
    if (typeof html !== 'string') return '';
    // Only allow search highlighting markup and basic formatting
    return html
      .replace(/<(?!\/?(mark|strong|em|code)\b)[^>]*>/gi, '') // Remove all tags except mark, strong, em, code
      .replace(/(<mark[^>]*>)/gi, '$1') // Keep all mark tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }
}

// Make globally available
window.DOMSanitizer = DOMSanitizer;

// ES6 export
export { DOMSanitizer };