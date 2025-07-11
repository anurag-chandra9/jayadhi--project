import React from 'react';
import './hero.css'; // ✅ fixed relative path

const Hero = () => {
  return (
    <section className="hero-section">
      <div className="hero-content">
        <h1 className="hero-title">Future-Ready Cyber Defense</h1>
        <p className="hero-tagline">
          Cybersecurity that adapts, protects, and scales with your growth.
        </p>
      </div>
    </section>
  );
};

export default Hero;
