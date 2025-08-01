const SecurityEvent = require('../models/securityEventModel');
const User = require('../models/userModel');
const moment = require('moment');

// --- Get data for the Heat Analytics tab ---
exports.getDashboardAnalytics = async (req, res) => {
    console.log('--- getDashboardAnalytics START ---');
    try {
        const sevenDaysAgo = moment().subtract(7, 'days').toDate();
        console.log('Fetching events for user:', req.user._id);

        const events = await SecurityEvent.find({
            user: req.user._id, 
            timestamp: { $gte: sevenDaysAgo }
        });
        console.log(`Found ${events.length} events for heatmap.`);

        // ... (rest of the function logic is the same)
        const totalEvents7d = events.length;
        const criticalEvents = events.filter(e => e.severity === 'critical').length;
        const events24h = events.filter(e => moment(e.timestamp).isAfter(moment().subtract(24, 'hours'))).length;
        const blockedIPs = 0;
        const trendAnalysis = { events24h, totalEvents7d, criticalEvents, blockedIPs };
        const distribution = events.reduce((acc, event) => {
            acc[event.eventType] = (acc[event.eventType] || 0) + 1;
            return acc;
        }, {});
        const eventTypeDistribution = Object.entries(distribution)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count);
        const heatmap = new Map();
        for (let i = 6; i >= 0; i--) {
            const day = moment().subtract(i, 'days').format('ddd').toUpperCase();
            heatmap.set(day, Array(24).fill(0));
        }
        events.forEach(event => {
            const day = moment(event.timestamp).format('ddd').toUpperCase();
            const hour = moment(event.timestamp).hour();
            if (heatmap.has(day)) {
                heatmap.get(day)[hour]++;
            }
        });
        
        console.log('--- getDashboardAnalytics SUCCESS ---');
        res.status(200).json({
            trendAnalysis,
            eventTypeDistribution,
            heatmap: Array.from(heatmap.entries()),
        });

    } catch (err) {
        console.error("--- CRITICAL ERROR in getDashboardAnalytics ---", err);
        res.status(500).json({ error: err.message });
    }
};


// --- Get data for the Peer Benchmarking tab ---
exports.getBenchmarkingData = async (req, res) => {
    console.log('--- getBenchmarkingData START ---');
    try {
        const twentyFourHoursAgo = moment().subtract(24, 'hours').toDate();
        console.log('Fetching user events for benchmarking...');
        const userEvents = await SecurityEvent.find({ 
            user: req.user._id,
            timestamp: { $gte: twentyFourHoursAgo }
        });
        console.log(`Found ${userEvents.length} user events.`);
        const yourMetrics = {
            securityEvents24h: userEvents.length,
            criticalEvents: userEvents.filter(e => e.severity === 'critical').length,
            responseTimeHours: 2.8
        };

        console.log('Fetching all events for industry average...');
        const allEvents = await SecurityEvent.find({ timestamp: { $gte: twentyFourHoursAgo } });
        console.log(`Found ${allEvents.length} total events.`);
        const totalUsers = await User.countDocuments();
        console.log(`Found ${totalUsers} total users.`);

        const industryAverage = {
            securityEvents24h: totalUsers > 0 ? allEvents.length / totalUsers : 0,
            criticalEvents: totalUsers > 0 ? allEvents.filter(e => e.severity === 'critical').length / totalUsers : 0,
            responseTimeHours: 4.2
        };

        console.log('--- getBenchmarkingData SUCCESS ---');
        res.status(200).json({
            yourMetrics,
            industryAverage
        });

    } catch (err) {
        console.error("--- CRITICAL ERROR in getBenchmarkingData ---", err);
        res.status(500).json({ error: err.message });
    }
};


// --- Get data for the Incident Forensics tab ---
exports.getIncidentForensics = async (req, res) => {
    console.log('--- getIncidentForensics START ---');
    try {
        console.log('Fetching incidents for user:', req.user._id);
        const incidents = await SecurityEvent.find({ user: req.user._id })
            .sort({ timestamp: -1 })
            .limit(20);
        console.log(`Found ${incidents.length} incidents.`);
        
        console.log('--- getIncidentForensics SUCCESS ---');
        res.status(200).json(incidents);

    } catch (err) {
        console.error("--- CRITICAL ERROR in getIncidentForensics ---", err);
        res.status(500).json({ error: err.message });
    }
};