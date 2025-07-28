import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './RiskDashboard.css';
import { authService } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Ensure useAuth is imported

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
    // FIX: Get user, authLoading, and userClaims from AuthContext
    const { user, loading: authLoading, userClaims } = useAuth();

    const [mainData, setMainData] = useState(null);
    const [wafData, setWafData] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [ipAddress, setIpAddress] = useState('');
    const [actionMessage, setActionMessage] = useState('');

    // FIX: Determine isAdmin based on userClaims.role
    const userRole = userClaims?.role || 'user'; // Use userClaims directly here
    const isAdmin = userRole === 'admin'; // Check if the role is 'admin' (lowercase)

    useEffect(() => {
        const fetchDashboardData = async () => {
            setDashboardLoading(true);
            try {
                // Everyone gets the main dashboard data
                const mainRes = await authService.makeAuthenticatedRequest('/api/dashboard');
                if (mainRes.ok) {
                    const data = await mainRes.json();
                    setMainData(data);
                } else {
                    console.error('RISK_DASHBOARD_ERROR: Failed to fetch main dashboard data:', mainRes.status, await mainRes.text());
                }

                // Admins fetch WAF data for the dashboard
                if (isAdmin) { // Now correctly checks the 'admin' role from userClaims
                    const wafRes = await authService.makeAuthenticatedRequest('/api/waf/dashboard');
                    if (wafRes.ok) {
                        const data = await wafRes.json();
                        setWafData(data);
                        console.log("RISK_DASHBOARD_DEBUG: WAF data fetched successfully:", data);
                    } else {
                        console.error('RISK_DASHBOARD_ERROR: Failed to fetch WAF summary data for admin:', wafRes.status, await wafRes.text());
                    }
                } else {
                    // If not admin, clear WAF data state
                    setWafData(null);
                }

            } catch (err) {
                console.error('RISK_DASHBOARD_ERROR: Error fetching dashboard data:', err);
            } finally {
                setDashboardLoading(false);
            }
        };

        // Only fetch data if we have a logged-in user and auth state is not loading
        if (!authLoading && userClaims) { // Trigger fetch when auth is not loading and claims are available
            fetchDashboardData();
        }
    }, [userClaims, authLoading, isAdmin]); // userClaims, authLoading, isAdmin are dependencies

    // handleIPAction to control WAF features directly on dashboard
    const handleIPAction = async (action) => {
        // The backend will enforce the 'admin' role for block/unblock actions.
        try {
            const response = await authService.makeAuthenticatedRequest(`/api/waf/${action}-ip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                    action === 'block'
                        ? { ipAddress, reason: 'manual block' }
                        : { ipAddress }
                )
            });
            const data = await response.json();
            if (response.ok) {
                setActionMessage(`✅ ${data.message}`);
                // Refetch WAF data to show updated blocked IPs
                if (isAdmin) {
                    const wafRes = await authService.makeAuthenticatedRequest('/api/waf/dashboard');
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
        // Conditionally show admin cards if desired (e.g., summary of WAF data)
        ...(isAdmin ? [
            { title: 'Total Blocked IPs (All)', value: wafData?.blockedIPs?.length ?? 0 }, // Using length of blockedIPs array
            { title: 'WAF Critical Events (24h)', value: wafData?.stats?.criticalEvents ?? 0 }, // Assuming stats object
            { title: 'Events Last 24h', value: wafData?.stats?.securityEvents24h ?? 0 }, // Assuming stats object
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

            {/* --- WAF Features RESTORED HERE, visible only for admins --- */}
            {isAdmin && ( // This condition uses the correct isAdmin variable
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
                                <thead>
                                    <tr>
                                        <th>IP Address</th>
                                        <th>Blocked On</th>
                                        <th>Blocked By</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {wafData.blockedIPs.map((ipObj, index) => (
                                        <tr key={ipObj.ipAddress || index}>
                                            <td>{ipObj.ipAddress}</td>
                                            <td>{ipObj.blockedAt ? new Date(ipObj.blockedAt).toLocaleString() : 'N/A'}</td>
                                            <td>{ipObj.blockedBy || 'System'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p>No currently blocked IPs</p>
                        )}
                    </motion.div>

                    <motion.div className="recent-events" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                        <h3>🛡️ Recent Security Events</h3>
                        {wafData?.events?.length > 0 ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Event Type</th>
                                        <th>Source IP</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {wafData.events.map((event, index) => (
                                        <tr key={event._id || index}>
                                            <td>{new Date(event.timestamp).toLocaleString()}</td>
                                            <td>{event.eventType}</td>
                                            <td>{event.ipAddress}</td>
                                            <td>{event.details}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p>No recent security events.</p>
                        )}
                    </motion.div>
                </>
            )}

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