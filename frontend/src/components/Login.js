// frontend/src/components/Login.js
import React, { useState } from 'react';
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

    const { login } = useAuth(); 
    const navigate = useNavigate(); 

    const handleLogin = async (e) => {
        e.preventDefault();
        setMessage('Logging in...');

        try {
            const result = await authService.loginWithFirebase(email, password);
            const appToken = result.backendData.token;

            if (result.success && appToken) {
                login(appToken);

                setMessage('Login successful ✅ Redirecting...');
                setTimeout(() => {
                    navigate('/risk-dashboard');
                }, 1000);
            } else {
                throw new Error("Application token not found from backend.");
            }
        } catch (err) {
            console.error('Login failed:', err.message);
            setMessage(`Login failed: ${err.message}`);

            // --- THIS IS THE FIX ---
            // After a login fails, we now send a report to our backend.
            // This will create a security event that appears in your analytics.
            try {
                const apiUrl = process.env.NODE_ENV === 'production' 
                    ? (process.env.REACT_APP_API_URL || 'https://jayadhi-project-hyrv.onrender.com')
                    : 'http://localhost:3000';

                fetch(`${apiUrl}/auth/report-failed-login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email: email }),
                });
            } catch (reportError) {
                // If this fails, we just log it to the console. It's not critical for the user.
                console.error("Failed to report failed login attempt:", reportError);
            }
            // --------------------
        }
    };

    return (
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
    );
};

export default Login;