import fetch from 'node-fetch';

async function testLoginEndpoint() {
  try {
    console.log('Testing login endpoint...');
    
    const response = await fetch('http://localhost:56304/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'adm-custmgr@a.com',
        password: '123'
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    const data = await response.text();
    console.log('Response body:', data);
    
    if (response.ok) {
      console.log('✅ Login successful');
    } else {
      console.log('❌ Login failed');
    }
    
  } catch (error) {
    console.error('❌ Request error:', error.message);
  }
}

testLoginEndpoint();