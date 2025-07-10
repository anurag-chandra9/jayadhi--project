import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <h3>Jayadhi App</h3>
      <div className="nav-links">
        {!isLoggedIn && (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
          </>
        )}

        {isLoggedIn && (
          <>
            <Link to="/home">Home</Link>
            <Link to="/assets">Assets</Link>
            <Link to="/risk-dashboard">Risk Dashboard</Link>
            <Link to="/report-incident">Report Incident</Link>
            <Link to="/chatbot">Chatbot</Link>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
