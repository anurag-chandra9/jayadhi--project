import React from 'react';
import './HomePage.css';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="home">
      <header className="hero">
        <h1>Secure Your Digital World</h1>
        <p>Your one-stop solution for enterprise-grade cybersecurity.</p>
        <Link to="/signup" className="cta-button">Get Started</Link>
      </header>

      <section className="features">
        <div className="feature">
          <h3>Real-Time Threat Detection</h3>
          <p>Monitor, detect, and mitigate threats as they happen.</p>
        </div>
       <Link to="/assets"> <div className="feature">
          <h3>Asset Management</h3>
          <p>Keep track of all your digital assets in one place.</p>
        </div></Link>
       <Link to="/risk-dashboard" className="feature"> <div className="feature">
          <h3>Risk Dashboard</h3>
          <p>Visualize security risks and get actionable insights.</p>
        </div></Link>
      </section>

      <footer className="footer">
        <p>&copy; 2025 Jayadhi Cybersecurity App. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomePage;
