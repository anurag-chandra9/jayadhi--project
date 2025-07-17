import React, { useState } from 'react';
import { authService } from '../firebase/firebase';
import { Eye, EyeOff } from 'lucide-react';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Step 1: Login via backend
      await authService.loginWithBackend(email, password);

      // Step 2: Get Firebase ID token
      const token = await authService.getIdToken();

      if (!token) {
        throw new Error('Failed to retrieve token');
      }

      // Step 3: Store token in localStorage
      localStorage.setItem('token', token);

      // Step 4: Redirect
      setMessage('Login successful ✅ Redirecting...');
      setTimeout(() => {
        window.location.href = '/risk-dashboard';
      }, 1000);
    } catch (err) {
      console.error('Login failed:', err.message);
      if (err.message.includes('temporarily blocked')) {
        setMessage('🚫 Your IP has been temporarily blocked due to failed login attempts.');
      } else if (err.message.includes('Invalid credentials')) {
        setMessage('❌ Invalid email or password.');
      } else {
        setMessage(`Something went wrong ❌: ${err.message}`);
      }
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

      <div className="password-wrapper">
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <span
          className="toggle-password"
          onClick={() => setShowPassword((prev) => !prev)}
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </span>
      </div>

      <button type="submit">Login</button>
      {message && <p>{message}</p>}
    </form>
  );
};

export default Login;
