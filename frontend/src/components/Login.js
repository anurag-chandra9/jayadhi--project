import React, { useState } from 'react';
// import { signInWithEmailAndPassword } from 'firebase/auth';
import { authService } from '../firebase/firebase'; // ✅ import from firebase.js
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // ✅ Step 1: Login via backend (gets custom token + Firebase ID token)
      const result = await authService.loginWithBackend(email, password);

      // ✅ Step 2: Token is now stored in authService
      // console.log('Logged in! ID Token:', await authService.getIdToken());

      // ✅ Step 3: Fetch WAF Dashboard
      // const response = await authService.makeAuthenticatedRequest('/api/waf/dashboard');
      // const data = await response.json();
      // console.log('🔥 WAF Dashboard Data:', data);

      // ✅ Step 4: Fetch General Dashboard
      // const response2 = await authService.makeAuthenticatedRequest('/api/dashboard');
      // const data2 = await response2.json();
      // console.log('📊 Cybersecurity Dashboard Data:', data2);

      setMessage('Logged in & fetched secured data successfully ✅');
      setTimeout(() => {
        window.location.href = '/risk-dashboard';
      }, 1500);
    } catch (err) {
      console.error('Login or fetch failed:', err.message);
      setMessage('Something went wrong ❌');
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <h2>Login</h2>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">Login</button>
      {message && <p>{message}</p>}
    </form>
  );
};

export default Login;
