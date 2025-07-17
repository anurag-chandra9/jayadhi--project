import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    // Whenever location changes, re-check login status
    setIsLoggedIn(!!localStorage.getItem('token'));
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false); // 👈 ensure state is updated
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h1 className="logo">
          <Link to="/home" className="logo-link">CyberSentinel</Link>
        </h1>
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
            <Link to="/subscription" className="nav-link">Subscription</Link>
            <Link to="/chatbot" className="nav-link">Chatbot</Link>
            <button className="btn logout-btn" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
