import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './RiskDashboard.css';
import { authService } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // <-- 1. IMPORT THE AUTH HOOK

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4 }
  })
};

const RiskDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // <-- 2. GET THE USER OBJECT (contains role)

  const [mainData, setMainData] = useState(null);
  const [wafData, setWafData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ipAddress, setIpAddress] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Everyone gets the main dashboard data
        const mainRes = await authService.makeAuthenticatedRequest('/api/dashboard');
        if (mainRes.ok) setMainData(await mainRes.json());

        // --- KEY CHANGE: Only Admins fetch WAF data ---
        if (user && user.role === 'Admin') {
          const wafRes = await authService.makeAuthenticatedRequest('/api/waf/dashboard');
          if (wafRes.ok) setWafData(await wafRes.json());
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch data if we have a logged-in user
    if (user) {
      fetchDashboardData();
    }
  }, [user]); // Re-run this effect if the user object changes (e.g., on login)

  const handleIPAction = async (action) => {
    // This function is now inside an admin-only component, so no extra checks needed here.
    try {
      const response = await authService.makeAuthenticatedRequest(`/api/waf/${action}-ip`, {
        method: 'POST',
        body: JSON.stringify(
          action === 'block'
            ? { ipAddress, reason: 'manual block' }
            : { ipAddress }
        )
      });
      const data = await response.json();
      if (response.ok) {
        setActionMessage(`✅ ${data.message}`);
        // Refetch data to show updated blocked IPs
        const wafRes = await authService.makeAuthenticatedRequest('/api/waf/dashboard');
        if (wafRes.ok) setWafData(await wafRes.json());
      } else {
        setActionMessage(`❌ ${data.error || data.message}`);
      }
    } catch (error) {
      setActionMessage(`❌ Failed to ${action} IP: ${error.message}`);
    }
  };

  if (loading) return <div className="loading">Loading Risk Dashboard...</div>;

  const cardData = [
    { title: 'Total Assets', value: mainData?.totalAssets ?? 'N/A' },
    { title: 'High Severity Threats', value: mainData?.highSeverityThreats ?? 'N/A' },
    { title: 'Compliance Score', value: `${mainData?.complianceScore ?? 0}%` },
    { title: 'Overall Risk', value: mainData?.overallRiskLevel ?? 'N/A' },
    // Conditionally show admin cards
    ...(user?.role === 'Admin' ? [
      { title: 'Total Blocked IPs', value: wafData?.stats?.totalBlockedIPs ?? 0 },
      { title: 'Critical Events (24h)', value: wafData?.stats?.criticalEvents ?? 0 },
      { title: 'Events Last 24h', value: wafData?.stats?.securityEvents24h ?? 0 },
    ] : [])
  ];

  return (
    <motion.div className="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <motion.h2 className="dashboard-title" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}>📊 Risk Analysis Dashboard</motion.h2>

      <div className="summary-cards">
        {cardData.map((item, i) => (
          <motion.div className="card" key={item.title} custom={i} variants={cardVariants} initial="hidden" animate="visible">
            <h3>{item.title}</h3>
            <p>{item.value}</p>
          </motion.div>
        ))}
      </div>

      {/* --- 3. WRAP ALL ADMIN SECTIONS IN A ROLE CHECK --- */}
      {user && user.role === 'Admin' && (
        <>
          <motion.div className="ip-controls" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <h3>🚦 Manual IP Control</h3>
            <input
              type="text"
              placeholder="Enter IP address (e.g. 127.0.0.1)"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
            />
            <div className="ip-buttons">
              <button onClick={() => handleIPAction('block')}>Block IP</button>
              <button onClick={() => handleIPAction('unblock')}>Unblock IP</button>
            </div>
            {actionMessage && <pre className="action-message">{actionMessage}</pre>}
          </motion.div>

          <motion.div className="blocked-ips" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <h3>🚫 Currently Blocked IPs</h3>
            {wafData?.blockedIPs?.length > 0 ? (
              <table>
                {/* Table content remains the same */}
              </table>
            ) : (
              <p>No currently blocked IPs</p>
            )}
          </motion.div>

          <motion.div className="recent-events" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <h3>🛡️ Recent Security Events</h3>
            {/* Table content remains the same */}
          </motion.div>
        </>
      )}

      {/* User-specific sections remain outside the admin check */}
      <motion.div className="report-incident-section" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        <h3>📝 Incident Reporting</h3>
        <p className="report-subtext">
          Report a new cybersecurity incident for documentation and insurance processing.
        </p>
        <button onClick={() => navigate('/report-incident')} className="report-incident-button">
          ➕ Create New Incident Report
        </button>
      </motion.div>

    </motion.div>
  );
};

export default RiskDashboard;