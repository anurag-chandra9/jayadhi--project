import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './RiskDashboard.css';
import { authService } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    const { user, loading: authLoading, userClaims } = useAuth(); // Get user, authLoading, and userClaims from AuthContext

    const [mainData, setMainData] = useState(null);
    // wafData state is no longer strictly needed if no WAF info is displayed,
    // but kept for potential admin-only summary cards if desired.
    const [wafData, setWafData] = useState(null); 
    const [dashboardLoading, setDashboardLoading] = useState(true);

    // Determine user's role from claims, defaulting to 'user' if not present
    const userRole = userClaims?.role || 'user';
    const isAdmin = userRole === 'admin';

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

                // If you still want SOME WAF data (e.g., total blocked IPs COUNT) in admin cards on dashboard, fetch here:
                if (isAdmin) {
                    const wafRes = await authService.makeAuthenticatedRequest('/api/waf/dashboard');
                    if (wafRes.ok) {
                        setWafData(await wafRes.json()); // Keep this to populate admin cards
                    } else {
                        console.error('RISK_DASHBOARD_ERROR: Failed to fetch WAF summary data for admin:', wafRes.status, await wafRes.text());
                    }
                } else {
                    setWafData(null); // Clear WAF data if not admin
                }

            } catch (err) {
                console.error('RISK_DASHBOARD_ERROR: Error fetching dashboard data:', err);
            } finally {
                setDashboardLoading(false);
            }
        };

        if (!authLoading && userClaims) { // Trigger fetch when auth is not loading and claims are available
            fetchDashboardData();
        }
    }, [userClaims, authLoading, isAdmin]); // user, authLoading, isAdmin are dependencies

    // Removed handleIPAction as the UI elements it controlled are being removed

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
            { title: 'Total Blocked IPs (All)', value: wafData?.blockedIPs?.length ?? 0 }, // Example WAF card
            { title: 'WAF Critical Events (24h)', value: wafData?.stats?.criticalEvents ?? 0 }, // Example WAF card
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

            {/* === REMOVED: MANUAL IP CONTROL, BLOCKED IPS TABLE, RECENT SECURITY EVENTS === */}
            {/* These features are now exclusively in AdminWAFManagement.jsx */}
            {/* The previous code for this section has been removed. */}

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