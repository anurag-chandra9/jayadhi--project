import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <h3>Jayadhi App</h3>
      <div className="nav-links">
        <Link to="/login">Login</Link>
        <Link to="/signup">Sign Up</Link>
        <Link to="/home">Home</Link>

        <Link to="/assets">Assets</Link>
        <Link to="/risk-dashboard">Risk Dashboard</Link>
        
        
      </div>
    </nav>
  );
};

export default Navbar;
