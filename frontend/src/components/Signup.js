import React, { useState } from 'react';
// import { createUserWithEmailAndPassword } from 'firebase/auth';
// import { setDoc, doc } from 'firebase/firestore';
// import { auth, db } from '../firebase/firebase';
import './Signup.css'; // ✅ Importing the CSS

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
    const apiUrl = process.env.NODE_ENV === 'production' 
      ? (process.env.REACT_APP_API_URL || 'https://jayadhi-project-hyrv.onrender.com')
      : (process.env.REACT_APP_API_URL || 'http://localhost:3000');
    
    const response = await fetch(`${apiUrl}/auth/signup`, {
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

    setMessage('Account created successfully ✅');

    setTimeout(() => {
      window.location.href = '/risk-dashboard';
    }, 1500);
  } catch (error) {
    console.error(error);
    setMessage(error.message || 'Signup failed ❌');
  }
};

  return (
    <div className="signup-wrapper">
      {/* Animated SVG Lines */}
        <svg className="circuit-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points="0,20 20,20 20,40 40,40" />
        <polyline points="60,0 60,20 80,20 80,40" />
        <polyline points="10,60 30,60 30,80 50,80" />
        <polyline points="70,70 70,90 90,90" />
      </svg>

      {/* Animated Dots */}
    <div className="animated-dots"></div>

      {/* Signup Form */}
    <form onSubmit={handleSignup} className="signup-container">
    <h2>Sign Up</h2>

    <input
      type="text"
      placeholder="First Name"
      value={firstName}
      onChange={(e) => setFirstName(e.target.value)}
      required
    />
    <input
      type="text"
      placeholder="Last Name"
      value={lastName}
      onChange={(e) => setLastName(e.target.value)}
      required
    />
    <input
      type="email"
      placeholder="Email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      required
    />
    <input
      type="password"
      placeholder="Password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      required
    />

    <button type="submit">Register</button>
    {message && <p className="message">{message}</p>}
    </form>
    </div>
  );
};

export default Signup;
