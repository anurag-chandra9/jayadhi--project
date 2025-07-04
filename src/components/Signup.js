import React, { useState } from 'react';
import './Signup.css';

const Signup = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const response = await fetch('http://localhost:3000/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: `${firstName}${lastName}`.toLowerCase(),
          email,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      setMessage('✅ Account created successfully');

      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch (error) {
      console.error(error);
      setMessage(error.message || '❌ Signup failed');
    }
  };

  return (
    <div className="auth-container">
      <div className="signup-card">
        <div className="signup-header">
          <h1><b>Jayadhi Limited</b></h1>
          <h2>Create your account</h2>
          
        </div>
        <form className="signup-form" onSubmit={handleSignup}>
          <label>First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder=""
            required
          />
          <label>Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder=""
            required
          />
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder=""
            required
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder=""
            required
          />
          <button type="submit">Register</button>
          {message && <p className="status-message">{message}</p>}
        </form>
        <div className="signup-footer">
          <p>Already have an account? <a href="/login">Login here</a></p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
