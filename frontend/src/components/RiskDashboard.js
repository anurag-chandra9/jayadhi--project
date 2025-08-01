import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './RiskDashboard.css';
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

// --- Sub-component for the Overview Tab ---
const OverviewTab = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [mainData, setMainData] = useState(null);
    const [wafData, setWafData] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [ipAddress, setIpAddress] = useState('');
    const [actionMessage, setActionMessage] = useState('');
    const isAdmin = user?.role?.toLowerCase() === 'admin';

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user || !user.token) {
                setDashboardLoading(false);
                return;
            }
            setDashboardLoading(true);
            try {
                const mainRes = await fetch('/api/dashboard', { headers: { 'Authorization': `Bearer ${user.token}` } });
                if (mainRes.ok) setMainData(await mainRes.json());

                if (isAdmin) {
                    const wafRes = await fetch('/api/waf/dashboard', { headers: { 'Authorization': `Bearer ${user.token}` } });
                    if (wafRes.ok) setWafData(await wafRes.json());
                }
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setDashboardLoading(false);
            }
        };
        if (!authLoading) fetchDashboardData();
    }, [user, authLoading, isAdmin]);

    const handleIPAction = async (action) => {
        try {
            const response = await fetch(`/api/waf/${action}-ip`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
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
            { title: 'Total Blocked IPs', value: wafData?.blockedIPs?.length ?? 0 },
            { title: 'Critical Events (24h)', value: wafData?.stats?.criticalEvents ?? 0 },
        ] : [])
    ];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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


// --- Sub-component for the Heat Analytics Tab ---
const HeatAnalyticsTab = () => {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const response = await fetch('/api/analytics/dashboard', {
                    headers: { 'Authorization': `Bearer ${user.token}` },
                });
                if (!response.ok) throw new Error('Failed to fetch analytics data');
                const result = await response.json();
                setData(result);
            } catch (error) {
                console.error("Error fetching heatmap data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const getSeverityColor = (count) => {
        if (count >= 10) return 'critical';
        if (count >= 5) return 'high';
        if (count > 0) return 'medium';
        return 'low';
    };

    if (loading) return <div className="loading">Loading Analytics...</div>;
    if (!data) return <div className="error-message">Could not load analytics data.</div>;

    const { trendAnalysis, eventTypeDistribution, heatmap } = data;

    return (
        <div className="analytics-content">
            <div className="analytics-section">
                <h3>Security Events Heatmap - Last 7 Days</h3>
                <div className="heatmap-legend">
                    <span className="legend-item low">Low</span>
                    <span className="legend-item medium">Medium</span>
                    <span className="legend-item high">High</span>
                    <span className="legend-item critical">Critical</span>
                </div>
                <div className="heatmap-grid">
                    {heatmap.map(([day, hours]) => (
                        <div key={day} className="heatmap-row">
                            <div className="day-label">{day}</div>
                            <div className="hour-squares">
                                {hours.map((count, i) => (
                                    <div 
                                        key={i} 
                                        className={`hour-square ${getSeverityColor(count)}`}
                                        title={`${count} events on ${day} at ${i}:00`}
                                    >
                                      {count > 0 && <span className="count-label">{count}</span>}
                                    </div>
                                ))}
                            </div>
                            <div className="day-total">{hours.reduce((a, b) => a + b, 0)} events</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="analytics-section">
                <h3>Event Type Distribution</h3>
                <ul className="distribution-list">
                    {eventTypeDistribution.map(event => (
                        <li key={event.type}>
                            <span>{event.type.replace(/_/g, ' ')}</span>
                            <span className="count">{event.count}</span>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="analytics-section">
                <h3>Trend Analysis</h3>
                <div className="trend-cards">
                    <div className="trend-card"><span>{trendAnalysis.events24h}</span>24h Events</div>
                    <div className="trend-card"><span>{trendAnalysis.totalEvents7d}</span>7d Events</div>
                    <div className="trend-card critical"><span>{trendAnalysis.criticalEvents}</span>Critical</div>
                    <div className="trend-card blocked"><span>{trendAnalysis.blockedIPs}</span>Blocked IPs</div>
                </div>
            </div>
        </div>
    );
};

// --- NEW: Sub-component for the Peer Benchmarking Tab ---
const PeerBenchmarkingTab = () => {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const response = await fetch('/api/analytics/benchmarking', {
                    headers: { 'Authorization': `Bearer ${user.token}` },
                });
                if (!response.ok) throw new Error('Failed to fetch benchmarking data');
                setData(await response.json());
            } catch (error) {
                console.error("Error fetching benchmarking data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    if (loading) return <div className="loading">Loading Benchmarking Data...</div>;
    if (!data) return <div className="error-message">Could not load data.</div>;

    const { yourMetrics, industryAverage } = data;

    const calculatePercentage = (yourScore, avgScore) => {
        if (avgScore === 0) return 100;
        return (yourScore / avgScore) * 100;
    };
    
    const BenchmarkingCard = ({ title, yourScore, avgScore, unit = '', lowerIsBetter = false }) => {
        const percentage = calculatePercentage(yourScore, avgScore);
        const isAboveAverage = lowerIsBetter ? yourScore < avgScore : yourScore > avgScore;
        
        return (
            <div className="benchmarking-section">
                <h3>{title}</h3>
                <div className="comparison-card">
                    <span className={`status-tag ${isAboveAverage ? 'above' : 'below'}`}>
                        {isAboveAverage ? '✓ Above Average' : '▼ Below Average'}
                    </span>
                    <div className="scores">
                        <div className="score-item"><span>YOUR SCORE:</span>{yourScore}{unit}</div>
                        <div className="score-item"><span>INDUSTRY AVG:</span>{avgScore}{unit}</div>
                    </div>
                    <div className="progress-bar-container">
                        <div className={`progress-bar ${isAboveAverage ? 'above' : 'below'}`} style={{ width: `${percentage > 100 ? 100 : percentage}%` }}></div>
                    </div>
                    <div className="percentage-label">{(percentage).toFixed(1)}% of industry average</div>
                </div>
            </div>
        );
    };

    return (
        <div className="analytics-content">
            <h3 className="tab-title">Peer Benchmarking Analysis</h3>
            <p className="tab-subtitle">Compare your security metrics against industry averages</p>
            <BenchmarkingCard title="24h Security Events" yourScore={yourMetrics.securityEvents24h} avgScore={industryAverage.securityEvents24h} lowerIsBetter={true} />
            <BenchmarkingCard title="Critical Events" yourScore={yourMetrics.criticalEvents} avgScore={industryAverage.criticalEvents} lowerIsBetter={true} />
            <BenchmarkingCard title="Response Time" yourScore={yourMetrics.responseTimeHours} avgScore={industryAverage.responseTimeHours} unit="hrs" lowerIsBetter={true} />
        </div>
    );
};


// --- NEW: Sub-component for the Incident Forensics Tab ---
const IncidentForensicsTab = () => {
    const { user } = useAuth();
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const response = await fetch('/api/analytics/forensics', {
                    headers: { 'Authorization': `Bearer ${user.token}` },
                });
                if (!response.ok) throw new Error('Failed to fetch incidents');
                setIncidents(await response.json());
            } catch (error) {
                console.error("Error fetching incidents:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    if (loading) return <div className="loading">Loading Incidents...</div>;

    return (
        <div className="forensics-timeline">
            <h3 className="tab-title">Incident Forensics Timeline</h3>
            <div className="timeline-filters">
                <button className="filter-btn active">Critical</button>
                <button className="filter-btn">High</button>
                <button className="filter-btn">Medium</button>
                <button className="filter-btn">Low</button>
            </div>
            <div className="timeline-container">
                {incidents.map(incident => (
                    <div key={incident._id} className="timeline-item">
                        <div className={`timeline-dot ${incident.impactLevel?.toLowerCase()}`}></div>
                        <div className="timeline-content">
                            <div className="event-header">
                                <h4>{incident.type}</h4>
                                <span>{new Date(incident.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="event-description">{incident.description}</p>
                            <div className="event-details">
                                <div className="detail-box"><span>Source IP:</span>{incident.sourceIp}</div>
                                <div className="detail-box"><span>Impact Level:</span>{incident.impactLevel}</div>
                                <div className="detail-box"><span>Affected Assets:</span>{Array.isArray(incident.affectedAssets) ? incident.affectedAssets.join(', ') : ''}</div>
                                <div className="detail-box"><span>Status:</span><span className="status-tag success">{incident.status}</span></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


// --- Main RiskDashboard Component (Now with Tabs) ---
const RiskDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return <OverviewTab />;
            case 'heat-analytics':
                return <HeatAnalyticsTab />;
            case 'peer-benchmarking':
                return <PeerBenchmarkingTab />;
            case 'incident-forensics':
                return <IncidentForensicsTab />;
            default:
                return null;
        }
    };

    return (
        <div className="dashboard-container">
            <h2 className="dashboard-main-title">Risk Analysis Dashboard</h2>
            <div className="dashboard-tabs">
                <button onClick={() => setActiveTab('overview')} className={activeTab === 'overview' ? 'active' : ''}>Overview</button>
                <button onClick={() => setActiveTab('heat-analytics')} className={activeTab === 'heat-analytics' ? 'active' : ''}>Heat Analytics</button>
                <button onClick={() => setActiveTab('peer-benchmarking')} className={activeTab === 'peer-benchmarking' ? 'active' : ''}>Peer Benchmarking</button>
                <button onClick={() => setActiveTab('incident-forensics')} className={activeTab === 'incident-forensics' ? 'active' : ''}>Incident Forensics</button>
            </div>
            <div className="dashboard-content">
                {renderContent()}
            </div>
        </div>
    );
};

export default RiskDashboard;
