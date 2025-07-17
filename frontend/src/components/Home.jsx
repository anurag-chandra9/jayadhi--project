import React from 'react';
import './HomePage.css';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { Shield, Database, BarChart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext'; // ✅ Using Auth Context

const HomePage = () => {
  const { isLoggedIn } = useAuth(); // ✅ Real-time auth state
  const navigate = useNavigate();

  const handleCTA = () => {
    if (!isLoggedIn) {
      toast.success('Redirecting to Signup...');
      navigate('/signup');
    }
  };

  const handleProtectedNavigation = (path) => {
    if (isLoggedIn) {
      navigate(path);
    } else {
      toast.error('Please log in to access this feature');
    }
  };

  return (
    <div className="home">
      <Toaster />
      <header className="hero">
        <h1>Secure Your Digital World</h1>
        <p>Next-gen protection for your business — from threats to resilience.</p>
        <button
          className={`cta-button ${isLoggedIn ? 'disabled' : ''}`}
          onClick={handleCTA}
          disabled={isLoggedIn}
        >
          {isLoggedIn ? 'You are Logged In' : 'Get Started'}
        </button>
      </header>

      <section className="features">
        <motion.div className="feature-card">
          <Shield size={32} color="#0f62fe" />
          <h3>Real-Time Threat Detection</h3>
          <p>Monitor and neutralize cyber threats as they emerge.</p>
        </motion.div>

        <motion.div
          className="feature-card"
          onClick={() => handleProtectedNavigation('/assets')}
        >
          <Database size={32} color="#0f62fe" />
          <h3>Asset Management</h3>
          <p>Organize, monitor, and secure all your critical assets.</p>
        </motion.div>

        <motion.div
          className="feature-card"
          onClick={() => handleProtectedNavigation('/risk-dashboard')}
        >
          <BarChart size={32} color="#0f62fe" />
          <h3>Risk Dashboard</h3>
          <p>Analyze vulnerabilities and stay ahead with insights.</p>
        </motion.div>
      </section>
    </div>
  );
};

export default HomePage;
