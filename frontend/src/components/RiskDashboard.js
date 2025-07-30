import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './RiskDashboard.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // 1. We only need the useAuth hook

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
    const { user, loading: authLoading } = useAuth(); // 2. Get the user object from our context

    const [mainData, setMainData] = useState(null);
    const [wafData, setWafData] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [ipAddress, setIpAddress] = useState('');
    const [actionMessage, setActionMessage] = useState('');

    // 3. Determine if the user is an admin directly from the user object (CASE-INSENSITIVE FIX)
    const isAdmin = user?.role?.toLowerCase() === 'admin';

    useEffect(() => {
        const fetchDashboardData = async () => {
            // Don't fetch if there's no user or token
            if (!user || !user.token) {
                setDashboardLoading(false);
                return;
            }

            setDashboardLoading(true);
            try {
                // 4. Use standard fetch with the correct token from the user object
                const mainRes = await fetch('/api/dashboard', {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });

                if (mainRes.ok) {
                    setMainData(await mainRes.json());
                }

                // Admins fetch WAF data
                if (isAdmin) {
                    const wafRes = await fetch('/api/waf/dashboard', {
                        headers: { 'Authorization': `Bearer ${user.token}` }
                    });
                    if (wafRes.ok) {
                        setWafData(await wafRes.json());
                    }
                }
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setDashboardLoading(false);
            }
        };

        // Only fetch data when the auth state is no longer loading
        if (!authLoading) {
            fetchDashboardData();
        }
    }, [user, authLoading, isAdmin]); // Dependencies for the effect

    const handleIPAction = async (action) => {
        try {
            const response = await fetch(`/api/waf/${action}-ip`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}` // Use the correct token
                },
                body: JSON.stringify(
                    action === 'block'
                        ? { ipAddress, reason: 'manual block' }
                        : { ipAddress }
                )
            });
            const data = await response.json();
            if (response.ok) {
                setActionMessage(`✅ ${data.message}`);
                // Refetch WAF data
                if (isAdmin) {
                    const wafRes = await fetch('/api/waf/dashboard', { headers: { 'Authorization': `Bearer ${user.token}` } });
                    if (wafRes.ok) setWafData(await wafRes.json());
                }
            } else {
                setActionMessage(`❌ ${data.error || data.message}`);
            }
        } catch (error) {
            setActionMessage(`❌ Failed to ${action} IP: ${error.message}`);
        }
    };

    if (dashboardLoading || authLoading) {
        return <div className="loading">Loading Risk Dashboard...</div>;
    }

    const cardData = [
        { title: 'Total Assets', value: mainData?.totalAssets ?? 'N/A' },
        { title: 'High Severity Threats', value: mainData?.highSeverityThreats ?? 'N/A' },
        { title: 'Compliance Score', value: `${mainData?.complianceScore ?? 0}%` },
        { title: 'Overall Risk', value: mainData?.overallRiskLevel ?? 'N/A' },
        ...(isAdmin ? [
            { title: 'Total Blocked IPs', value: wafData?.stats?.totalBlockedIPs ?? 0 },
            { title: 'Critical Events (24h)', value: wafData?.stats?.criticalEvents ?? 0 },
        ] : [])
    ];

    return (
        <motion.div className="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.h2 className="dashboard-title">📊 Risk Analysis Dashboard</motion.h2>

            <div className="summary-cards">
                {cardData.map((item, i) => (
                    <motion.div className="card" key={item.title} custom={i} variants={cardVariants} initial="hidden" animate="visible">
                        <h3>{item.title}</h3>
                        <p>{item.value}</p>
                    </motion.div>
                ))}
            </div>

            {isAdmin && (
                <>
                    <motion.div className="ip-controls" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}>
                        <h3>🚦 Manual IP Control</h3>
                        <input
                            type="text"
                            placeholder="Enter IP address"
                            value={ipAddress}
                            onChange={(e) => setIpAddress(e.target.value)}
                        />
                        <div className="ip-buttons">
                            <button onClick={() => handleIPAction('block')}>Block IP</button>
                            <button onClick={() => handleIPAction('unblock')}>Unblock IP</button>
                        </div>
                        {actionMessage && <pre className="action-message">{actionMessage}</pre>}
                    </motion.div>

                    <motion.div className="blocked-ips" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}>
                        <h3>🚫 Currently Blocked IPs</h3>
                        {wafData?.blockedIPs?.length > 0 ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>IP Address</th>
                                        <th>Reason</th>
                                        <th>Blocked At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {wafData.blockedIPs.map((ip) => (
                                        <tr key={ip._id}>
                                            <td>{ip.ipAddress}</td>
                                            <td>{ip.reason}</td>
                                            <td>{new Date(ip.blockedAt).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p>No currently blocked IPs</p>
                        )}
                    </motion.div>
                </>
            )}

            <motion.div className="report-incident-section" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}>
                <h3>📝 Incident Reporting</h3>
                <p className="report-subtext">Report a new cybersecurity incident.</p>
                <button onClick={() => navigate('/report-incident')} className="report-incident-button">
                    ➕ Create New Incident Report
                </button>
            </motion.div>
        </motion.div>
    );
};

export default RiskDashboard;
