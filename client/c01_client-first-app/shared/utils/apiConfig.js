// API Configuration - uses relative path for production, localhost for development
(function() {
  let API_BASE_URL;
  
  // Check if we're in development (localhost) or production
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Development mode - use localhost with backend port
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', './config/app.json', false);
      xhr.send();
      if (xhr.status === 200) {
        const config = JSON.parse(xhr.responseText);
        console.log('Loaded config:', config);
        if (config.ports && config.ports.backend) {
          API_BASE_URL = `http://localhost:${config.ports.backend}`;
          console.log('Development API_BASE_URL:', API_BASE_URL);
        }
      }
    } catch (error) {
      API_BASE_URL = 'http://localhost:3001';
      console.warn('Could not load API config, using default:', API_BASE_URL);
    }
  } else {
    // Production mode - use relative path (assumes reverse proxy)
    API_BASE_URL = '/api';
    console.log('Production API_BASE_URL:', API_BASE_URL);
  }
  
  // Set global API base URL
  window.API_BASE_URL = API_BASE_URL;
  console.log('Final API_BASE_URL:', window.API_BASE_URL);
})();