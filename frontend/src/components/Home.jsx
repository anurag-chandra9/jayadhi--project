import React, { useEffect, useState } from 'react';
import './HomePage.css';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/firebase';
import toast, { Toaster } from 'react-hot-toast';
import { Shield, Database, BarChart } from 'lucide-react';
import { motion } from 'framer-motion';

const HomePage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  const handleCTA = () => {
    if (!isLoggedIn) {
      toast.success('Redirecting to Signup...');
      navigate('/signup');
    }
  };

  return (
    <div className="home">
      <Toaster />
      <header className="hero">
        <svg className="hero-wave" viewBox="0 0 1440 320">
          <path
            fill="#0f2027"
            fillOpacity="1"
            d="M0,224L60,213.3C120,203,240,181,360,192C480,203,600,245,720,250.7C840,256,960,224,1080,197.3C1200,171,1320,149,1380,138.7L1440,128V0H0Z"
          ></path>
        </svg>
        <h1>Secure Your Digital World</h1>
        <p>Next-gen protection for your business — from threats to resilience.</p>

        
      </header>

      <section className="features">
        <motion.div
          className="feature-card"
          role="button"
          tabIndex={0}
          whileHover={{ scale: 1.05 }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <Shield size={32} color="#0f62fe" />
          <h3>Real-Time Threat Detection</h3>
          <p>Monitor and neutralize cyber threats as they emerge.</p>
        </motion.div>

        <Link to="/assets" className="feature-card-link">
          <motion.div
            className="feature-card"
            whileHover={{ scale: 1.05 }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <Database size={32} color="#0f62fe" />
            <h3>Asset Management</h3>
            <p>Organize, monitor, and secure all your critical assets.</p>
          </motion.div>
        </Link>

        <Link to="/risk-dashboard" className="feature-card-link">
          <motion.div
            className="feature-card"
            whileHover={{ scale: 1.05 }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
          >
            <BarChart size={32} color="#0f62fe" />
            <h3>Risk Dashboard</h3>
            <p>Analyze vulnerabilities and stay ahead with insights.</p>
          </motion.div>
        </Link>
      </section>

      <section className="testimonials">
        <h2>Trusted by Security Teams Worldwide</h2>
        <div className="testimonial-boxes">
          <div className="testimonial">
            <p>"CyberSecure helped us reduce breaches by 80%. Their dashboard is gold."</p>
            <span>— Alex Morgan, CTO @ NetProtect</span>
          </div>
          <div className="testimonial">
            <p>"Powerful asset tracking and instant alerts. A must-have in 2025."</p>
            <span>— Rina K., Security Analyst @ CloudMatrix</span>
          </div>
        </div>
      </section>

      <section className="trust-logos">
        <img loading="lazy" src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/IBM_logo.svg/1200px-IBM_logo.svg.png" alt="IBM Logo" />
        <img loading="lazy" src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/1200px-Microsoft_logo.svg.png" alt="Microsoft Logo" />
        <img loading="lazy" src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Accenture.svg/1200px-Accenture.svg.png" alt="Accenture Logo" />
      </section>

      <footer className="footer">
        © {new Date().getFullYear()} CyberSecure Inc. | Built for digital defense
      </footer>
    </div>
  );
};

export default HomePage;
