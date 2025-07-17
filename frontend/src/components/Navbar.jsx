import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('token'));
    setIsMenuOpen(false); // close menu on route change
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
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

      <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
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
