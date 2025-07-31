// frontend/src/components/Login.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
        setMessage(''); // Clear previous messages

        try {
            // *** CRITICAL CHANGE HERE: Use authService.loginWithFirebase ***
            const loginResult = await authService.loginWithFirebase(email, password);

            // The loginWithFirebase method already handles the client-side Firebase auth
            // and sending the ID token to your backend's /firebase-login route.
            // It should return the user and potentially the token after backend validation.
            // Ensure authService.loginWithFirebase returns the idToken for localStorage if needed.
            if (loginResult && loginResult.idToken) {
                localStorage.setItem('token', loginResult.idToken);
            } else if (loginResult && loginResult.user) {
                // If loginWithFirebase returns user but not idToken directly,
                // you might need to fetch it separately, though it should be set by then.
                const currentToken = await authService.getIdToken();
                if (currentToken) {
                    localStorage.setItem('token', currentToken);
                }
            }


            setMessage('Login successful ✅ Redirecting...');
            setTimeout(() => {
                window.location.href = '/risk-dashboard'; // Redirect after successful login
            }, 1000);

        } catch (err) {
            console.error('Login failed:', err); // Log the full error object for better debugging

            // Refined error handling based on Firebase client SDK error codes
            let errorMessage = 'Something went wrong ❌. Please try again.';

            if (err.code) { // Firebase client-side errors typically have a 'code' property
                switch (err.code) {
                    case 'auth/wrong-password':
                    case 'auth/user-not-found':
                    case 'auth/invalid-credential': // Generic error for wrong email/password if enumeration protection is on
                        errorMessage = '❌ Invalid email or password.';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = '🚫 Too many failed login attempts. Your account may be temporarily locked. Please try again later.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = '❌ The email address is not valid.';
                        break;
                    case 'auth/user-disabled':
                        errorMessage = '🚫 Your account has been disabled. Please contact support.';
                        break;
                    case 'auth/network-request-failed':
                        errorMessage = '⚠️ Network error. Please check your internet connection.';
                        break;
                    case 'auth/email-not-verified': // If you require email verification
                        errorMessage = '⚠️ Please verify your email address to log in.';
                        break;
                    default:
                        errorMessage = `Firebase error: ${err.message}`;
                }
            } else if (err.message) { // Fallback for general errors or backend messages
                if (err.message.includes('Backend validation failed')) {
                    errorMessage = '❌ Login failed due to backend validation error.';
                } else if (err.message.includes('Failed to retrieve token')) {
                    errorMessage = 'Login failed: Authentication token could not be retrieved.';
                }
                else {
                    errorMessage = `Error: ${err.message}`;
                }
            }
            setMessage(errorMessage);
        }
    };

    return (
    <div className="login-wrapper">
      {/* Animated SVG Lines */}
      <svg className="circuit-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points="0,20 20,20 20,40 40,40" />
        <polyline points="60,0 60,20 80,20 80,40" />
        <polyline points="10,60 30,60 30,80 50,80" />
        <polyline points="70,70 70,90 90,90" />
      </svg>

      {/* Animated Dots Layer */}
      <div className="animated-dots"></div>

      {/* Login Form */}
      <form onSubmit={handleLogin} className="login-container">
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
        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
};

export default Login;