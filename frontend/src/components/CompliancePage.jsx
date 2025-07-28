import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './CompliancePage.css'; // We will create this CSS file next

const CompliancePage = () => {
  const { user } = useAuth();
  const [complianceItems, setComplianceItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchComplianceData = async () => {
      // Don't fetch if the user isn't logged in or token is not available
      if (!user || !user.token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch('/api/compliance', {
          headers: {
            'Authorization': `Bearer ${user.token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch compliance data.');
        }

        const data = await response.json();
        setComplianceItems(data);
        setError('');
      } catch (err) {
        setError(err.message);
        console.error("Fetch compliance error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchComplianceData();
  }, [user]);

  const handleStatusChange = async (itemId, newStatus) => {
    try {
      const response = await fetch('/api/compliance/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({ itemId, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status.');
      }

      // Update the state locally to reflect the change immediately
      setComplianceItems(prevItems =>
        prevItems.map(item =>
          item._id === itemId ? { ...item, status: newStatus } : item
        )
      );
    } catch (err) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  if (loading) return <div className="loading">Loading Compliance Data...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="compliance-container">
      <h2>Compliance Tracker</h2>
      <p>Track your adherence to key cybersecurity frameworks and regulations.</p>
      
      <table className="compliance-table">
        <thead>
          <tr>
            <th>Framework</th>
            <th>Related Asset</th>
            <th>Status</th>
            <th>Last Checked</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {complianceItems.length > 0 ? (
            complianceItems.map((item) => (
              <tr key={item._id}>
                <td>{item.framework}</td>
                <td>{item.asset ? item.asset.name : 'N/A'}</td>
                <td>
                  <span className={`status-badge status-${item.status}`}>
                    {item.status}
                  </span>
                </td>
                <td>{new Date(item.lastChecked).toLocaleDateString()}</td>
                <td>
                  <select 
                    value={item.status} 
                    onChange={(e) => handleStatusChange(item._id, e.target.value)}
                    className="status-select"
                  >
                    <option value="in-progress">In Progress</option>
                    <option value="compliant">Compliant</option>
                    <option value="non-compliant">Non-Compliant</option>
                  </select>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center' }}>No compliance items found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CompliancePage;
