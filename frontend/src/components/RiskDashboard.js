import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './RiskDashboard.css';
import { authService } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RiskDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mainData, setMainData] = useState(null);
  const [wafData, setWafData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ipAddress, setIpAddress] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const mainRes = await authService.makeAuthenticatedRequest('/api/dashboard');
        if (mainRes.ok) setMainData(await mainRes.json());

        if (user?.role === 'Admin') {
          const wafRes = await authService.makeAuthenticatedRequest('/api/waf/dashboard');
          if (wafRes.ok) setWafData(await wafRes.json());
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchDashboardData();
  }, [user]);

  const handleIPAction = async (action) => {
    try {
      const response = await authService.makeAuthenticatedRequest(`/api/waf/${action}-ip`, {
        method: 'POST',
        body: JSON.stringify(
          action === 'block' ? { ipAddress, reason: 'manual block' } : { ipAddress }
        )
      });
      const data = await response.json();
      if (response.ok) {
        setActionMessage(`✅ ${data.message}`);
        const wafRes = await authService.makeAuthenticatedRequest('/api/waf/dashboard');
        if (wafRes.ok) setWafData(await wafRes.json());
      } else {
        setActionMessage(`❌ ${data.error || data.message}`);
      }
    } catch (error) {
      setActionMessage(`❌ Failed to ${action} IP: ${error.message}`);
    }
  };

  const cardData = [
    { title: 'Total Assets', value: mainData?.totalAssets ?? 'N/A' },
    { title: 'High Severity Threats', value: mainData?.highSeverityThreats ?? 'N/A' },
    { title: 'Compliance Score', value: `${mainData?.complianceScore ?? 0}%` },
    { title: 'Overall Risk', value: mainData?.overallRiskLevel ?? 'N/A' },
    ...(user?.role === 'Admin'
      ? [
          { title: 'Total Blocked IPs', value: wafData?.stats?.totalBlockedIPs ?? 0 },
          { title: 'Critical Events (24h)', value: wafData?.stats?.criticalEvents ?? 0 },
          { title: 'Events Last 24h', value: wafData?.stats?.securityEvents24h ?? 0 }
        ]
      : [])
  ];

  if (loading) return <div className="dashboard-loading">Loading Risk Dashboard...</div>;

  return (
    <motion.div className="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <motion.h2 className="dashboard-title" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
        📊 Risk Analysis Dashboard
      </motion.h2>

      <div className="summary-cards">
        {cardData.map((item, i) => (
          <motion.div className="dashboard-card" key={item.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <h3>{item.title}</h3>
            <p>{item.value}</p>
          </motion.div>
        ))}
      </div>

      {user?.role === 'Admin' && (
        <>
          <div className="admin-section ip-controls">
            <h3>🚦 Manual IP Control</h3>
            <input type="text" value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} placeholder="Enter IP address" />
            <div className="ip-buttons">
              <button onClick={() => handleIPAction('block')}>Block IP</button>
              <button onClick={() => handleIPAction('unblock')}>Unblock IP</button>
            </div>
            {actionMessage && <div className="action-message">{actionMessage}</div>}
          </div>

          <div className="admin-section blocked-ips">
            <h3>🚫 Currently Blocked IPs</h3>
            {wafData?.blockedIPs?.length ? (
              <table>
                <thead><tr><th>IP Address</th><th>Reason</th><th>Date</th></tr></thead>
                <tbody>
                  {wafData.blockedIPs.map((ip) => (
                    <tr key={ip.ip}>
                      <td>{ip.ip}</td>
                      <td>{ip.reason}</td>
                      <td>{ip.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p>No IPs currently blocked.</p>}
          </div>

          <div className="admin-section recent-events">
            <h3>🛡️ Recent Security Events</h3>
            {wafData?.recentEvents?.length ? (
              <table>
                <thead><tr><th>Type</th><th>Details</th><th>Time</th></tr></thead>
                <tbody>
                  {wafData.recentEvents.map((event, idx) => (
                    <tr key={idx}>
                      <td>{event.type}</td>
                      <td>{event.description}</td>
                      <td>{event.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p>No recent events.</p>}
          </div>
        </>
      )}

      <div className="report-incident-section">
        <h3>📝 Incident Reporting</h3>
        <p>Report a new cybersecurity incident for documentation and action.</p>
        <button onClick={() => navigate('/report-incident')} className="report-incident-button">
          ➕ Report Incident
        </button>
      </div>
    </motion.div>
  );
};

export default RiskDashboard;
