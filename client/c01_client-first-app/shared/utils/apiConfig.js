// API Configuration - reads backend port from app.json
(function() {
  let API_BASE_URL = 'http://localhost:3001';
  
  // Load API configuration from app.json synchronously
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', './config/app.json', false); // synchronous
    xhr.send();
    if (xhr.status === 200) {
      const config = JSON.parse(xhr.responseText);
      console.log('Loaded config:', config);
      if (config.ports && config.ports.backend) {
        API_BASE_URL = `http://localhost:${config.ports.backend}`;
        console.log('Set API_BASE_URL to:', API_BASE_URL);
      }
    }
  } catch (error) {
    console.warn('Could not load API config, using default port 3001:', error);
  }
  
  // Set global API base URL
  window.API_BASE_URL = API_BASE_URL;
  console.log('Final API_BASE_URL:', window.API_BASE_URL);
})();