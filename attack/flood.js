const fetch = require('node-fetch');

async function floodLogin() {
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'wrongpassword'
        })
      });

      const json = await res.json();
      console.log(`[${i + 1}]`, res.status, json.message || json.error);
    } catch (err) {
      console.error('Request failed:', err.message);
    }
  }
}

floodLogin();
