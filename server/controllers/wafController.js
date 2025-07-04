const BlockedIP = require('../models/blockedIPModel');
const SecurityEvent = require('../models/securityEventModel');
const { WAFCore, WAFLogger } = require('../middleware/firewallMiddleware');
const AuthTracker = require('../middleware/authTracker');

// Get WAF dashboard data
exports.getWAFDashboard = async (req, res) => {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get statistics
    const stats = {
      totalBlockedIPs: await BlockedIP.countDocuments({ isTemporary: false }),
      temporaryBlocks: await BlockedIP.countDocuments({ isTemporary: true, expiresAt: { $gt: new Date() } }),
      securityEvents24h: await SecurityEvent.countDocuments({ timestamp: { $gte: last24Hours } }),
      securityEvents7d: await SecurityEvent.countDocuments({ timestamp: { $gte: last7Days } }),
      criticalEvents: await SecurityEvent.countDocuments({ 
        severity: 'critical', 
        timestamp: { $gte: last7Days } 
      })
    };

    // Get recent security events
    const recentEvents = await SecurityEvent.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .select('ipAddress eventType severity description timestamp blocked');

    // Get blocked IPs
    const blockedIPs = await BlockedIP.find({ 
      $or: [
        { isTemporary: false },
        { expiresAt: { $gt: new Date() } }
      ]
    }).sort({ blockedAt: -1 }).limit(20);

    // Event type distribution
    const eventTypes = await SecurityEvent.aggregate([
      { $match: { timestamp: { $gte: last7Days } } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      stats,
      recentEvents,
      blockedIPs,
      eventTypes
    });
  } catch (err) {
    WAFLogger.error('Error fetching WAF dashboard data', { error: err.message });
    res.status(500).json({ error: err.message });
  }
};

// Manually block an IP
exports.blockIP = async (req, res) => {
  try {
    const { ipAddress, reason, duration, isTemporary = true } = req.body;
    
    if (!ipAddress || !reason) {
      return res.status(400).json({ error: 'IP address and reason are required' });
    }

    // Normalize the IP address before blocking
    const normalizedIP = WAFCore.normalizeIP(ipAddress);
    const blockDuration = duration || 24 * 60 * 60 * 1000; // Default 24 hours
    
    const success = await WAFCore.blockIP(normalizedIP, reason, {
      duration: blockDuration,
      isTemporary,
      userAgent: 'Manual Block'
    });

    if (success) {
      res.json({ 
        message: 'IP blocked successfully', 
        originalIP: ipAddress,
        normalizedIP: normalizedIP 
      });
    } else {
      res.status(500).json({ error: 'Failed to block IP' });
    }
  } catch (err) {
    WAFLogger.error('Error manually blocking IP', { error: err.message });
    res.status(500).json({ error: err.message });
  }
};

// FIXED: Enhanced unblock function with comprehensive IP normalization
exports.unblockIP = async (req, res) => {
  try {
    const { ipAddress } = req.body;

    if (!ipAddress) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    const unblocker = req.user?.email || 'admin';
    
    // FIXED: Normalize the input IP address and generate all possible variations
    const normalizedIP = WAFCore.normalizeIP(ipAddress);
    const ipVariations = [
      ipAddress,           // Original input
      normalizedIP,        // Normalized version
      '127.0.0.1',        // Standard localhost
      '::1',              // IPv6 localhost
      '::ffff:127.0.0.1', // IPv6 mapped IPv4 localhost
      'localhost'         // Hostname
    ];

    // Remove duplicates
    const uniqueIPs = [...new Set(ipVariations)];
    
    let totalDeleted = 0;
    const deletedEntries = [];

    WAFLogger.info('Starting comprehensive IP unblock process', { 
      originalIP: ipAddress, 
      normalizedIP,
      ipVariations: uniqueIPs,
      unblocker 
    });

    // 1. Try to unblock all IP variations
    for (const ip of uniqueIPs) {
      const regularDelete = await BlockedIP.deleteOne({ ipAddress: ip });
      if (regularDelete.deletedCount > 0) {
        totalDeleted += regularDelete.deletedCount;
        deletedEntries.push(`regular IP: ${ip}`);
        WAFLogger.info('Deleted regular IP block', { ipAddress: ip });
      }
    }

    // 2. Try to unblock ALL possible client frontend variations for each IP
    const clientOrigins = [
      'http://client1.local:3001',
      'http://client2.local:3002', 
      'http://localhost:3001',
      'http://localhost:3002'
    ];
    
    for (const ip of uniqueIPs) {
      for (const origin of clientOrigins) {
        // OLD FORMAT: ip:origin
        const oldClientKey = `${ip}:${origin}`;
        const clientDelete = await BlockedIP.deleteOne({ ipAddress: oldClientKey });
        if (clientDelete.deletedCount > 0) {
          totalDeleted += clientDelete.deletedCount;
          deletedEntries.push(`client frontend (old): ${oldClientKey}`);
          WAFLogger.info('Deleted old format client block', { oldClientKey });
        }

        // NEW FORMAT: CLIENT:ip:origin
        const newClientKey = `CLIENT:${ip}:${origin}`;
        const newFormatDelete = await BlockedIP.deleteOne({ ipAddress: newClientKey });
        if (newFormatDelete.deletedCount > 0) {
          totalDeleted += newFormatDelete.deletedCount;
          deletedEntries.push(`client frontend (new): ${newClientKey}`);
          WAFLogger.info('Deleted new format client block', { newClientKey });
        }
      }
    }

    // 3. Use AuthTracker to clear any in-memory failed attempts for all IP variations
    for (const ip of uniqueIPs) {
      const authTrackerResult = await AuthTracker.unblockIP(ip);
      if (authTrackerResult.success) {
        WAFLogger.info('AuthTracker unblock completed', { 
          ipAddress: ip, 
          results: authTrackerResult.results 
        });
      }
    }

    // 4. Additional cleanup: Find any blocks that might have any of the IPs as part of a composite key
    for (const ip of uniqueIPs) {
      const compositeBlocks = await BlockedIP.find({ 
        ipAddress: { $regex: ip.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
      });
      
      for (const block of compositeBlocks) {
        if (!uniqueIPs.includes(block.ipAddress)) {
          const compositeDelete = await BlockedIP.deleteOne({ _id: block._id });
          if (compositeDelete.deletedCount > 0) {
            totalDeleted += compositeDelete.deletedCount;
            deletedEntries.push(`composite block: ${block.ipAddress}`);
            WAFLogger.info('Deleted composite block', { blockKey: block.ipAddress });
          }
        }
      }
    }

    // 5. Clear any cached entries in WAF core for all IP variations
    if (WAFCore.clearIPCache) {
      uniqueIPs.forEach(ip => WAFCore.clearIPCache(ip));
    }

    // 6. Log the unblocking action
    if (totalDeleted > 0) {
      await SecurityEvent.create({
        ipAddress: normalizedIP,
        eventType: 'ip_unblocked',
        severity: 'info',
        description: `IP and related blocks manually unblocked by ${unblocker}. Original IP: ${ipAddress}, Normalized: ${normalizedIP}. Deleted: ${deletedEntries.join(', ')}`,
        requestUrl: req.originalUrl,
        requestMethod: req.method,
        userAgent: req.headers['user-agent'],
        payload: { 
          originalIP: ipAddress,
          normalizedIP,
          ipVariations: uniqueIPs,
          deletedEntries, 
          totalDeleted, 
          unblocker 
        }
      });

      WAFLogger.info('IP and related blocks unblocked successfully', { 
        originalIP: ipAddress,
        normalizedIP,
        ipVariations: uniqueIPs,
        by: unblocker, 
        totalDeleted,
        deletedEntries 
      });

      res.json({ 
        success: true,
        message: 'IP and related blocks unblocked successfully', 
        originalIP: ipAddress,
        normalizedIP,
        ipVariations: uniqueIPs,
        by: unblocker,
        totalDeleted,
        deletedEntries
      });
    } else {
      WAFLogger.warn('No blocks found for unblocking', { 
        originalIP: ipAddress, 
        normalizedIP,
        ipVariations: uniqueIPs,
        by: unblocker 
      });
      
      res.status(404).json({ 
        success: false,
        error: 'No blocks found for this IP address',
        originalIP: ipAddress,
        normalizedIP,
        ipVariations: uniqueIPs,
        message: 'IP was not blocked or blocks have already expired',
        searchedFor: [
          ...uniqueIPs,
          ...clientOrigins.flatMap(origin => 
            uniqueIPs.flatMap(ip => [
              `${ip}:${origin}`,
              `CLIENT:${ip}:${origin}`
            ])
          )
        ]
      });
    }

  } catch (err) {
    WAFLogger.error('Error unblocking IP', { 
      originalIP: req.body.ipAddress, 
      error: err.message 
    });
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: 'Internal server error during unblocking process'
    });
  }
};

// Get security events with filtering
exports.getSecurityEvents = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      severity, 
      eventType, 
      ipAddress,
      startDate,
      endDate 
    } = req.query;

    const query = {};
    
    if (severity) query.severity = severity;
    if (eventType) query.eventType = eventType;
    
    // FIXED: Handle IP address search with normalization
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

    const events = await SecurityEvent.find(query)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SecurityEvent.countDocuments(query);

    res.json({
      events,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    WAFLogger.error('Error fetching security events', { error: err.message });
    res.status(500).json({ error: err.message });
  }
};

// FIXED: Enhanced check block status function with comprehensive IP checking
exports.checkBlockStatus = async (req, res) => {
  try {
    const { ipAddress } = req.query;
    
    if (!ipAddress) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    // FIXED: Generate all possible IP variations
    const normalizedIP = WAFCore.normalizeIP(ipAddress);
    const ipVariations = [
      ipAddress,           // Original input
      normalizedIP,        // Normalized version
      '127.0.0.1',        // Standard localhost
      '::1',              // IPv6 localhost
      '::ffff:127.0.0.1', // IPv6 mapped IPv4 localhost
      'localhost'         // Hostname
    ];

    // Remove duplicates
    const uniqueIPs = [...new Set(ipVariations)];
    const blocks = [];
    
    // Check all IP variations for regular blocks
    for (const ip of uniqueIPs) {
      const regularBlock = await BlockedIP.findOne({ ipAddress: ip });
      if (regularBlock) {
        blocks.push({ 
          type: 'regular', 
          ip: ip,
          key: ip,
          block: regularBlock,
          isActive: regularBlock.isActive()
        });
      }
    }

    // Client frontend blocks
    const clientOrigins = [
      'http://client1.local:3001',
      'http://client2.local:3002', 
      'http://localhost:3001',
      'http://localhost:3002'
    ];
    
    for (const ip of uniqueIPs) {
      for (const origin of clientOrigins) {
        // OLD FORMAT: ip:origin
        const oldClientKey = `${ip}:${origin}`;
        const clientBlock = await BlockedIP.findOne({ ipAddress: oldClientKey });
        if (clientBlock) {
          blocks.push({ 
            type: 'client_old', 
            ip: ip,
            origin, 
            key: oldClientKey,
            block: clientBlock,
            isActive: clientBlock.isActive()
          });
        }
        
        // NEW FORMAT: CLIENT:ip:origin
        const newClientKey = `CLIENT:${ip}:${origin}`;
        const newClientBlock = await BlockedIP.findOne({ ipAddress: newClientKey });
        if (newClientBlock) {
          blocks.push({ 
            type: 'client_new', 
            ip: ip,
            origin, 
            key: newClientKey,
            block: newClientBlock,
            isActive: newClientBlock.isActive()
          });
        }
      }
    }

    // Also check for any composite blocks that might contain any of the IPs
    for (const ip of uniqueIPs) {
      const compositeBlocks = await BlockedIP.find({ 
        ipAddress: { $regex: ip.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
      });
      
      for (const block of compositeBlocks) {
        if (!uniqueIPs.includes(block.ipAddress) && !blocks.find(b => b.key === block.ipAddress)) {
          blocks.push({
            type: 'composite',
            ip: ip,
            key: block.ipAddress,
            block: block,
            isActive: block.isActive()
          });
        }
      }
    }

    // Filter only active blocks
    const activeBlocks = blocks.filter(b => b.isActive);

    res.json({
      originalIP: ipAddress,
      normalizedIP,
      ipVariations: uniqueIPs,
      isBlocked: activeBlocks.length > 0,
      totalBlocks: blocks.length,
      activeBlocks: activeBlocks.length,
      blocks: blocks.map(b => ({
        type: b.type,
        ip: b.ip,
        key: b.key,
        origin: b.origin,
        isActive: b.isActive,
        reason: b.block.reason,
        blockedAt: b.block.blockedAt,
        expiresAt: b.block.expiresAt,
        isTemporary: b.block.isTemporary
      }))
    });
  } catch (err) {
    WAFLogger.error('Error checking block status', { error: err.message });
    res.status(500).json({ error: err.message });
  }
};