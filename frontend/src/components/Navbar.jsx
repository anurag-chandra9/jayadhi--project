import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Check login from authService, not localStorage
    const token = localStorage.getItem('token'); // You may replace this if using Firebase context
    setIsLoggedIn(!!token);
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setMenuOpen(false);
    navigate('/login');
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h1 className="logo">
          <Link to="/home" className="logo-link">CyberSentinel</Link>
        </h1>
      </div>

      <div className="menu-toggle" onClick={toggleMenu}>
        <span className="bar"></span>
        <span className="bar"></span>
        <span className="bar"></span>
      </div>

      <div className={`nav-links ${menuOpen ? 'active' : ''}`}>
        {!isLoggedIn ? (
          <>
            <Link to="/login" className="btn impact-btn" onClick={() => setMenuOpen(false)}>Login</Link>
            <Link to="/signup" className="btn impact-btn" onClick={() => setMenuOpen(false)}>Signup</Link>
          </>
        ) : (
          <>
            <Link to="/home" className="nav-link" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link to="/assets" className="nav-link" onClick={() => setMenuOpen(false)}>Assets</Link>
            <Link to="/risk-dashboard" className="nav-link" onClick={() => setMenuOpen(false)}>Risk Dashboard</Link>
            <Link to="/report-incident" className="nav-link" onClick={() => setMenuOpen(false)}>Report Incident</Link>
            <Link to="/subscription" className="nav-link" onClick={() => setMenuOpen(false)}>Subscription</Link>
            <Link to="/chatbot" className="nav-link" onClick={() => setMenuOpen(false)}>Chatbot</Link>
            <button className="btn logout-btn" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
