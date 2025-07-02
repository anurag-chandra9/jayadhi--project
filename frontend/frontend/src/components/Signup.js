import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save extra user data to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email,
        firstName,
        lastName
      });

      setMessage('Account created successfully ✅');
      setTimeout(() => {
        window.location.href = '/login'; // Or redirect with React Router
      }, 1500);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setMessage('Email already in use ❌');
      } else {
        setMessage('Signup failed ❌');
        console.error(error);
      }
    }
  };

  return (
    <div className="signup-container">
      <form onSubmit={handleSignup}>
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
