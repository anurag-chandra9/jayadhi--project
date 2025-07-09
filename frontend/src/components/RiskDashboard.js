import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './RiskDashboard.css';
import { authService } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';

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
  const [mainData, setMainData] = useState(null);
  const [wafData, setWafData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ipAddress, setIpAddress] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const fetchDashboardData = async () => {
    try {
      const [mainRes, wafRes] = await Promise.all([
        authService.makeAuthenticatedRequest('/api/dashboard'),
        authService.makeAuthenticatedRequest('/api/waf/dashboard')
      ]);
      setMainData(await mainRes.json());
      setWafData(await wafRes.json());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const waitForTokenAndFetch = async () => {
      let retries = 0;
      while (!authService.idToken && retries < 10) {
        await new Promise((r) => setTimeout(r, 300));
        retries++;
      }
      authService.idToken ? fetchDashboardData() : setLoading(false);
    };
    waitForTokenAndFetch();
  }, []);

  const handleIPAction = async (action) => {
    try {
      const response = await authService.makeAuthenticatedRequest(`/api/waf/${action}-ip`, {
        method: 'POST',
        body: JSON.stringify(
          action === 'block'
            ? { ipAddress, reason: 'manual block', duration: 3600000 }
            : { ipAddress }
        )
      });

      const data = await response.json();
      if (response.ok) {
        setActionMessage(`✅ ${data.message}`);
        fetchDashboardData();
      } else {
        const msg = [`❌ ${data.error || data.message}`];
        if (data.ipVariations) msg.push(`🔍 Tried: ${data.ipVariations.join(', ')}`);
        if (data.searchedFor) msg.push(`💡 Suggestions: ${data.searchedFor.slice(0, 5).join(', ')}...`);
        setActionMessage(msg.join('\n'));
      }
    } catch (error) {
      setActionMessage(`❌ Failed to ${action} IP: ${error.message}`);
    }
  };

  if (loading) return <div className="loading">Loading Risk Dashboard...</div>;

  const cardData = [
    { title: 'Total Assets', value: mainData?.totalAssets },
    { title: 'High Severity Threats', value: mainData?.highSeverityThreats },
    { title: 'Compliance Score', value: mainData?.complianceScore },
    { title: 'Overall Risk', value: mainData?.overallRiskLevel },
    { title: 'Total Blocked IPs', value: wafData?.stats?.totalBlockedIPs },
    { title: 'Critical Events (24h)', value: wafData?.stats?.criticalEvents },
    { title: 'Events Last 24h', value: wafData?.stats?.securityEvents24h },
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
            <thead>
              <tr>
                <th>IP Address</th>
                <th>Reason</th>
                <th>Blocked At</th>
                <th>Expires At</th>
              </tr>
            </thead>
            <tbody>
              {wafData.blockedIPs.map((ip) => (
                <tr key={ip._id}>
                  <td>{ip.ipAddress}</td>
                  <td>{ip.reason}</td>
                  <td>{new Date(ip.blockedAt).toLocaleString()}</td>
                  <td>{new Date(ip.expiresAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No currently blocked IPs</p>
        )}
      </motion.div>

      <motion.div className="report-incident-section" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        <h3>📝 Incident Reporting</h3>
        <p className="report-subtext">
          Report a new cybersecurity incident for documentation and insurance processing.
        </p>
        <button onClick={() => navigate('/report-incident')} className="report-incident-button">
          ➕ Create New Incident Report
        </button>
      </motion.div>

      <motion.div className="recent-events" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        <h3>🛡️ Recent Security Events</h3>
        <table>
          <thead>
            <tr>
              <th>IP</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Description</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {wafData?.recentEvents?.slice(0, 10).map((event) => (
              <tr key={event._id}>
                <td>{event.ipAddress}</td>
                <td>{event.eventType}</td>
                <td>{event.severity}</td>
                <td>{event.description}</td>
                <td>{new Date(event.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  );
};

export default RiskDashboard;
