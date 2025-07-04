import React, { useState } from 'react';
import { authService } from '../firebase/firebase';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await authService.loginWithBackend(email, password);
      setMessage('✅ Logged in successfully');
    } catch (err) {
      if (err.message.includes('temporarily blocked')) {
        setMessage('🚫 Your IP has been temporarily blocked.');
      } else if (err.message.includes('Invalid credentials')) {
        setMessage('❌ Invalid email or password.');
      } else {
        setMessage(`❌ Something went wrong: ${err.message}`);
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="login-card">
        <div className="login-header">
          <h2><b>Jayadhi Limited</b></h2>
          <h2>Login your account</h2>
          <p>Please enter your credentials to continue</p>
        </div>
        <form onSubmit={handleLogin} className="login-form">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder=""
            required
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder=""
            required
          />
          <button type="submit">Login</button>
          {message && <p className="status-message">{message}</p>}
        </form>
        <div className="login-footer">
        </div>
      </div>
    </div>
  );
};

export default Login;
