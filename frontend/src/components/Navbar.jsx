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
      <div className="navbar-left">
        <h1 className="logo">CyberSentinel</h1>
      </div>

      <div className="nav-links">
        {!isLoggedIn ? (
          <>
            <Link to="/login" className="btn impact-btn">Login</Link>
            <Link to="/signup" className="btn impact-btn">Signup</Link>
          </>
        ) : (
          <>
            <Link to="/home" className="nav-link">Home</Link>
            <Link to="/assets" className="nav-link">Assets</Link>
            <Link to="/risk-dashboard" className="nav-link">Risk Dashboard</Link>
            <Link to="/report-incident" className="nav-link">Report Incident</Link>
            <Link to="/chatbot" className="nav-link">Chatbot</Link>
            <button className="btn logout-btn" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
