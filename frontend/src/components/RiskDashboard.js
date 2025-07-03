import React, { useEffect, useState } from 'react';
import './RiskDashboard.css';
import { authService } from '../firebase/firebase'; // ✅ correct path

const RiskDashboard = () => {
  const [mainData, setMainData] = useState(null);
  const [wafData, setWafData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [mainRes, wafRes] = await Promise.all([
        authService.makeAuthenticatedRequest('/api/dashboard'),
        authService.makeAuthenticatedRequest('/api/waf/dashboard')
      ]);

      const mainJson = await mainRes.json();
      const wafJson = await wafRes.json();

      setMainData(mainJson);
      setWafData(wafJson);
    } catch (err) {
      console.error('❌ Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return <div className="loading">Loading Risk Dashboard...</div>;

  return (
    <div className="dashboard">
      <h2>📊 Risk Analysis Dashboard</h2>

      <div className="summary-cards">
        <div className="card">
          <h3>Total Assets</h3>
          <p>{mainData?.totalAssets}</p>
        </div>
        <div className="card">
          <h3>High Severity Threats</h3>
          <p>{mainData?.highSeverityThreats}</p>
        </div>
        <div className="card">
          <h3>Compliance Score</h3>
          <p>{mainData?.complianceScore}</p>
        </div>
        <div className="card">
          <h3>Overall Risk</h3>
          <p>{mainData?.overallRiskLevel}</p>
        </div>
        <div className="card">
          <h3>Total Blocked IPs</h3>
          <p>{wafData?.stats?.totalBlockedIPs}</p>
        </div>
        <div className="card">
          <h3>Critical Events (24h)</h3>
          <p>{wafData?.stats?.criticalEvents}</p>
        </div>
        <div className="card">
          <h3>Events Last 24h</h3>
          <p>{wafData?.stats?.securityEvents24h}</p>
        </div>
      </div>

      <div className="recent-events">
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
      </div>
    </div>
  );
};

export default RiskDashboard;
