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
            // --- THIS IS THE FIX ---
            // The function name has been corrected to match your authService.
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
