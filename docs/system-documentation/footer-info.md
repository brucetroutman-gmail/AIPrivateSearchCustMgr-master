# AIPrivateSearch Footer Documentation

## Overview
The footer is a standardized component used across all three AIPrivateSearch applications (main app, web marketing site, and customer manager) to provide consistent branding, legal information, and navigation links.

## Footer Content

### Structure
The footer contains two main sections:

1. **Footer Links** (First Line)
   - Privacy Policy
   - Terms of Service  
   - Contact

2. **Copyright Information** (Second and Third Lines)
   - © 2025 AI Private Search Group. All rights reserved.
   - Licensed under Creative Commons Attribution-NonCommercial (CC BY-NC-ND)

### HTML Structure
```html
<footer class="footer">
  <div class="footer-content">
    <div class="footer-links">
      <a href="./privacy-policy.html">Privacy Policy</a>
      <a href="./terms-of-service.html">Terms of Service</a>
      <a href="./contact.html">Contact</a>
    </div>
    <div class="copyright">
      <p>&copy; 2025 <a href="./group.html" class="footer-link" id="footer-group-link">AI Private Search Group</a>. All rights reserved.</p>
      <p>Licensed under <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/" class="footer-link">Creative Commons Attribution-NonCommercial (CC BY-NC-ND)</a>.</p>
    </div>
  </div>
</footer>
```

## Referenced Pages
The footer links to several pages that must be present in each application:

1. **privacy-policy.html** - Privacy policy and data handling information
2. **terms-of-service.html** - Terms of service and usage agreements
3. **contact.html** - Contact information and support details
4. **group.html** - Information about AI Private Search Group

## CSS Styling

### Footer Container
- Background: Uses header background color (`var(--header-bg)`)
- Text color: White
- Padding: 2rem vertical, 0 horizontal
- Margin: Auto top margin to push to bottom of page

### Footer Content
- Max width: 1200px
- Centered with auto margins
- Horizontal padding: 2rem
- Text alignment: Center

### Footer Links
- Margin bottom: 1rem for separation
- Links styled with muted color (#bdc3c7)
- Hover effect changes to white
- Horizontal margin: 1rem between links

### Dark Mode Support
- Footer links appear white in dark theme
- Maintains consistent appearance across themes

## Implementation Across Applications

### File Locations
- **Main App**: `/client/c01_client-first-app/shared/footer.html`
- **Web Marketing**: `/client/c01_client-marketing/shared/footer.html`
- **Customer Manager**: `/client/c01_client-first-app/shared/footer.html`

### Loading Method
All applications use dynamic footer loading:

1. **HTML Placeholder**: `<div id="footer-placeholder"></div>`
2. **JavaScript Loading**: Footer loaded via `common.js` module
3. **Fetch Implementation**: Footer HTML fetched and inserted into placeholder

### Integration in Index Pages
Each application's index.html includes:

```html
<!-- Footer placeholder -->
<div id="footer-placeholder"></div>

<!-- Common.js handles footer loading -->
<script type="module" src="shared/common.js"></script>
```

## Consistency Requirements

### Content Consistency
- All three applications use identical footer.html files
- Same links, text, and structure across all apps
- Consistent copyright year and licensing information

### Styling Consistency  
- All applications use identical footer CSS rules
- Same colors, spacing, and typography
- Consistent responsive behavior

### Functional Consistency
- All applications load footer dynamically using common.js
- Same placeholder div ID (`footer-placeholder`)
- Identical error handling for footer loading failures

## Maintenance

### Updating Footer Content
1. Update the master footer.html in main application
2. Copy to web marketing and customer manager applications
3. Ensure all referenced pages exist in each application
4. Test footer display across all three applications

### Updating Footer Styling
1. Update styles.css in main application footer section
2. Copy updated styles.css to other applications
3. Verify consistent appearance across all applications
4. Test in both light and dark themes

### Adding New Footer Links
1. Add link to footer.html structure
2. Create corresponding page in all three applications
3. Update CSS if needed for additional links
4. Test navigation from all applications

## Technical Notes

### CSS Classes Used
- `.footer` - Main footer container
- `.footer-content` - Content wrapper with max-width
- `.footer-links` - Links container
- `.footer-link` - Individual footer links
- `.copyright` - Copyright text container

### JavaScript Dependencies
- Requires `common.js` module for dynamic loading
- Uses fetch API for loading footer HTML
- Error handling for failed footer loads

### Responsive Design
- Footer adapts to different screen sizes
- Maintains readability on mobile devices
- Links remain accessible across all viewport sizes

## Future Considerations

### Potential Enhancements
- Add social media links
- Include additional legal pages
- Add newsletter signup
- Implement footer sitemap

### Maintenance Schedule
- Annual copyright year update
- Quarterly link validation
- Regular accessibility testing
- Periodic legal content review