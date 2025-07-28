// server/controllers/wafController.js
const BlockedIP = require('../models/blockedIPModel'); // Assuming you have a BlockedIP Mongoose model
const SecurityEvent = require('../models/securityEventModel'); // Assuming you log events
const AuthTracker = require('../middleware/authTracker'); // To get getClientIP
const { WAFLogger, WAFCore } = require('../middleware/firewallMiddleware'); // Assuming you use WAFLogger and WAFCore

const getWAFDashboard = async (req, res) => {
    console.log("WAF_CONTROLLER_DEBUG: getWAFDashboard function called.");
    try {
        const { uid, email, role } = req.user;

        let blockedIPs;
        if (role === 'admin') {
            console.log("WAF_CONTROLLER_DEBUG: Admin fetching all blocked IPs.");
            console.log("WAF_CONTROLLER_DEBUG: Initiating BlockedIP.find({}) query."); // NEW LOG
            blockedIPs = await BlockedIP.find({}); // Fetch all from DB
            console.log("WAF_CONTROLLER_DEBUG: BlockedIP.find({}) query completed."); // NEW LOG
        } else {
            console.log("WAF_CONTROLLER_DEBUG: Regular user fetching WAF data (returning empty array for now).");
            blockedIPs = [];
        }

        console.log("WAF_CONTROLLER_DEBUG: Preparing to send response for getWAFDashboard."); // NEW LOG
        res.status(200).json({
            success: true,
            message: 'WAF Dashboard data retrieved successfully.',
            blockedIPs: blockedIPs
        });

    } catch (error) {
        console.error('WAF_CONTROLLER_ERROR: Error in getWAFDashboard:', error);
        res.status(500).json({ message: 'Failed to retrieve WAF dashboard data.', error: error.message || 'Unknown error' });
    }
};

const blockIP = async (req, res) => {
    const ipAddress = req.body.ipAddress;
    const ip = AuthTracker.getClientIP(req);
    console.log(`WAF_CONTROLLER_DEBUG: blockIP function called for IP: ${ipAddress}`);
    try {
        if (!ipAddress) {
            return res.status(400).json({ message: 'IP address is required.' });
        }
        const reason = req.body.reason || 'manual block';
        const duration = req.body.duration || 24 * 60 * 60 * 1000;
        const isTemporary = req.body.isTemporary !== undefined ? req.body.isTemporary : true;

        console.log("WAF_CONTROLLER_DEBUG: Calling WAFCore.blockIP.");
        const success = await WAFCore.blockIP(ipAddress, reason, {
            duration: duration,
            isTemporary: isTemporary,
            blockedBy: req.user.email,
            userAgent: req.headers['user-agent']
        });
        console.log("WAF_CONTROLLER_DEBUG: WAFCore.blockIP completed. Success:", success);

        if (success) {
            res.json({
                message: 'IP blocked successfully',
                ipAddress: ipAddress
            });
        } else {
            res.status(500).json({ error: 'Failed to block IP' });
        }
    } catch (err) {
        console.error('WAF_CONTROLLER_ERROR: Error manually blocking IP', { error: err.message });
        res.status(500).json({ error: err.message });
    }
};

const unblockIP = async (req, res) => {
    const ipAddress = req.body.ipAddress;
    const ip = AuthTracker.getClientIP(req);
    console.log(`WAF_CONTROLLER_DEBUG: unblockIP function called for IP: ${ipAddress}`);
    try {
        if (!ipAddress) {
            return res.status(400).json({ message: 'IP address is required.' });
        }

        console.log("WAF_CONTROLLER_DEBUG: Calling AuthTracker.unblockIP.");
        const unblockResult = await AuthTracker.unblockIP(ipAddress);
        console.log("WAF_CONTROLLER_DEBUG: AuthTracker.unblockIP completed. Result:", unblockResult);

        if (unblockResult.success) {
            res.json({ success: true, message: `IP ${ipAddress} has been successfully unblocked.`, details: unblockResult.results });
        } else {
            res.status(404).json({ success: false, message: unblockResult.error || `No active blocks found for ${ipAddress}.` });
        }

    } catch (error) {
        console.error('WAF_CONTROLLER_ERROR: Error unblocking IP:', error);
        res.status(500).json({ message: 'Failed to unblock IP.', error: error.message || 'Unknown error' });
    }
};

const getSecurityEvents = async (req, res) => {
    console.log("WAF_CONTROLLER_DEBUG: getSecurityEvents function called.");
    try {
        const { page = 1, limit = 50, severity, eventType, ipAddress, startDate, endDate } = req.query;
        const { uid, email, role } = req.user;

        const query = {};

        if (severity) query.severity = severity;
        if (eventType) query.eventType = eventType;

        if (ipAddress) {
            const normalizedIP = WAFCore.normalizeIP(ipAddress);
            const ipVariations = [
                ipAddress,
                normalizedIP,
                '127.0.0.1',
                '::1',
                '::ffff:127.0.0.1'
            ];
            const uniqueIPs = [...new Set(ipVariations)];
            query.ipAddress = { $in: uniqueIPs };
        }

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        if (role !== 'admin') {
            console.log("WAF_CONTROLLER_DEBUG: Non-admin user fetching security events. Returning empty array for now.");
            return res.json({ events: [], totalPages: 0, currentPage: page, total: 0 });
        }

        console.log("WAF_CONTROLLER_DEBUG: Admin fetching all security events from DB.");
        const events = await SecurityEvent.find(query)
            .sort({ timestamp: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        console.log("WAF_CONTROLLER_DEBUG: SecurityEvent.find query completed. Results count:", events.length);

        const total = await SecurityEvent.countDocuments(query);

        res.json({
            events,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (err) {
        WAFLogger.error('WAF_CONTROLLER_ERROR: Error fetching security events', { error: err.message });
        res.status(500).json({ error: err.message });
    }
};

const checkBlockStatus = async (req, res) => {
    console.warn("WAF_CONTROLLER_WARN: checkBlockStatus called. This function might be redundant or misplaced.");
    try {
        const { ipAddress } = req.query;

        if (!ipAddress) {
            return res.status(400).json({ error: 'IP address is required' });
        }

        const isBlocked = await WAFCore.isIPBlocked(ipAddress);

        res.json({ ipAddress, isBlocked });
    } catch (err) {
        console.error('WAF_CONTROLLER_ERROR: Error checking block status:', err);
        res.status(500).json({ error: err.message });
    }
};


module.exports = {
    getWAFDashboard,
    blockIP,
    unblockIP,
    getSecurityEvents,
    checkBlockStatus
};