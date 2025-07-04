const BlockedIP = require('../models/blockedIPModel');
const SecurityEvent = require('../models/securityEventModel');
const { SecurityPatterns } = require('../config/securityPatterns');
const { sendMaliciousPatternAlert, sendRateLimitAlert, sendSuspiciousURLAlert, sendIPBlockedAlert } = require('./wafAlerts');
const fs = require('fs');
const path = require('path');

// In-memory cache for frequently checked IPs (performance optimization)
const ipCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiting storage (in-memory)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 100;

class WAFLogger {
  static logPath = path.join(__dirname, '../logs/waf.log');

  static async log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...data
    };

    // Log to console
    console.log(`[WAF-${level.toUpperCase()}] ${timestamp}: ${message}`, data);

    // Log to file
    try {
      const logDir = path.dirname(this.logPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      fs.appendFileSync(this.logPath, JSON.stringify(logEntry) + '\n');
    } catch (err) {
      console.error('WAF Logger error:', err);
    }
  }

  static info(message, data) { this.log('info', message, data); }
  static warn(message, data) { this.log('warn', message, data); }
  static error(message, data) { this.log('error', message, data); }
  static critical(message, data) { this.log('critical', message, data); }
}

class WAFCore {
  // Enhanced IP blocking check to handle both regular and client frontend blocks
  static async isIPBlocked(ipAddress) {
    // Check cache first
    const cacheKey = `blocked_${ipAddress}`;
    const cached = ipCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.blocked;
    }

    try {
      const blockedIP = await BlockedIP.findOne({
        ipAddress,
        $or: [
          { isTemporary: false },
          { expiresAt: { $gt: new Date() } }
        ]
      });

      const isBlocked = !!blockedIP;

      // Cache result
      ipCache.set(cacheKey, {
        blocked: isBlocked,
        timestamp: Date.now()
      });

      return isBlocked;
    } catch (err) {
      WAFLogger.error('Error checking blocked IP', { ipAddress, error: err.message });
      return false;
    }
  }

  // Enhanced client-specific blocking check
  static async isClientBlocked(ipAddress, req) {
    try {
      // First check regular IP block
      const regularBlock = await this.isIPBlocked(ipAddress);
      if (regularBlock) {
        WAFLogger.info('Client blocked - regular IP block found', { ipAddress });
        return true;
      }

      // Check client frontend specific blocks if applicable
      if (this.isTrustedIP(ipAddress) && this.isClientFrontend(req)) {
        const origin = req.headers.origin;

        // Check new format (CLIENT:ip:origin)
        const newClientKey = `CLIENT:${ipAddress}:${origin}`;
        const newFormatBlocked = await this.isIPBlocked(newClientKey);

        if (newFormatBlocked) {
          WAFLogger.info('Client blocked - new format block found', {
            ipAddress,
            blockingKey: newClientKey,
            origin
          });
          return true;
        }

        // Check old format for backward compatibility (ip:origin)
        const oldClientKey = `${ipAddress}:${origin}`;
        const oldFormatBlocked = await this.isIPBlocked(oldClientKey);

        if (oldFormatBlocked) {
          WAFLogger.info('Client blocked - old format block found', {
            ipAddress,
            blockingKey: oldClientKey,
            origin
          });
          return true;
        }
      }

      return false;
    } catch (err) {
      WAFLogger.error('Error checking client block status', { ipAddress, error: err.message });
      return false;
    }
  }

  // Generate consistent blocking key for all WAF operations
  static generateBlockingKey(ipAddress, req) {
    if (this.isTrustedIP(ipAddress) && this.isClientFrontend(req)) {
      // Always use the CLIENT: prefix for localhost client frontends
      return `CLIENT:${ipAddress}:${req.headers.origin}`;
    }
    return ipAddress; // Regular IP blocking for external requests
  }

  // Generate consistent rate limiting key
  static generateRateLimitKey(ipAddress, req) {
    if (this.isTrustedIP(ipAddress) && this.isClientFrontend(req)) {
      // Use CLIENT format for rate limiting tracking too
      return `CLIENT:${ipAddress}:${req.headers.origin}`;
    }
    return ipAddress;
  }

  static async blockIP(ipAddress, reason, options = {}) {
    const {
      duration = 24 * 60 * 60 * 1000, // 24 hours default
      isTemporary = true,
      userAgent = null,
      failedAttempts = 1
    } = options;

    try {
      const expiresAt = isTemporary ? new Date(Date.now() + duration) : null;

      await BlockedIP.findOneAndUpdate(
        { ipAddress },
        {
          $set: {
            reason,
            blockedAt: new Date(),
            expiresAt,
            isTemporary,
            userAgent,
            lastAttempt: new Date()
          },
          $inc: { failedAttempts }
        },
        { upsert: true, new: true }
      );

      // Clear cache
      ipCache.delete(`blocked_${ipAddress}`);

      WAFLogger.critical('IP Address Blocked', {
        ipAddress,
        reason,
        duration: isTemporary ? duration : 'permanent',
        userAgent
      });

      return true;
    } catch (err) {
      WAFLogger.error('Error blocking IP', { ipAddress, reason, error: err.message });
      return false;
    }
  }

  static async unblockIP(ipAddress) {
    try {
      await BlockedIP.deleteOne({ ipAddress });
      ipCache.delete(`blocked_${ipAddress}`);

      WAFLogger.info('IP Address Unblocked', { ipAddress });
      return true;
    } catch (err) {
      WAFLogger.error('Error unblocking IP', { ipAddress, error: err.message });
      return false;
    }
  }

  // Add cache clearing method
  static clearIPCache(ipAddress) {
    try {
      // Clear specific IP cache
      ipCache.delete(`blocked_${ipAddress}`);

      // Clear any composite keys that might contain this IP
      const keysToDelete = [];
      for (const [key, value] of ipCache.entries()) {
        if (key.includes(ipAddress)) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => ipCache.delete(key));

      WAFLogger.info('IP cache cleared', { ipAddress, clearedKeys: keysToDelete.length });
    } catch (err) {
      WAFLogger.error('Error clearing IP cache', { ipAddress, error: err.message });
    }
  }

  static async logSecurityEvent(eventData) {
    try {
      const event = new SecurityEvent(eventData);
      await event.save();

      WAFLogger.warn('Security Event Logged', eventData);

      return event;
    } catch (err) {
      WAFLogger.error('Error logging security event', { error: err.message, eventData });
    }
  }

  // Use consistent rate limiting keys
  static checkRateLimit(rateLimitKey) {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;

    if (!rateLimitStore.has(rateLimitKey)) {
      rateLimitStore.set(rateLimitKey, []);
    }

    const requests = rateLimitStore.get(rateLimitKey);

    // Remove old requests outside the window
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    rateLimitStore.set(rateLimitKey, recentRequests);

    // Add current request
    recentRequests.push(now);

    return recentRequests.length > MAX_REQUESTS_PER_WINDOW;
  }

  // UPDATED: Use patterns from external config with enhanced details
  static detectMaliciousPayload(data) {
    const payload = JSON.stringify(data);

    // Use SecurityPatterns to get detailed pattern information
    const matchingPattern = SecurityPatterns.getMatchingPattern(payload);

    if (matchingPattern) {
      return {
        detected: true,
        pattern: matchingPattern.pattern,
        description: matchingPattern.description,
        severity: matchingPattern.severity,
        category: matchingPattern.category,
        payload: payload.substring(0, 200) // Limit payload size in logs
      };
    }

    return { detected: false };
  }

  // UPDATED: Enhanced suspicious URL detection with details from config
  static detectSuspiciousUrl(url) {
    const urlDetails = SecurityPatterns.getSuspiciousUrlDetails(url);

    if (urlDetails) {
      return {
        detected: true,
        path: urlDetails.path,
        description: urlDetails.description,
        severity: urlDetails.severity,
        blockDuration: urlDetails.block_duration
      };
    }

    return { detected: false };
  }

  // Helper methods for IP and frontend detection
  static isTrustedIP(ipAddress) {
    const TRUSTED_IPS = [
      '127.0.0.1',
      '::1',
      '::ffff:127.0.0.1',
      'localhost'
    ];

    const normalizedIP = this.normalizeIP(ipAddress);
    return TRUSTED_IPS.includes(ipAddress) || TRUSTED_IPS.includes(normalizedIP);
  }

  static normalizeIP(ip) {
    if (!ip) return 'unknown';

    // Handle IPv6 localhost variations
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
      return '127.0.0.1';
    }

    // Extract IPv4 from IPv6 mapped addresses
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }

    return ip;
  }

  static isAdminFrontend(req) {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const host = req.headers.host;

    // ONLY admin frontend gets complete WAF bypass
    const ADMIN_ORIGINS = [
      'http://admin3.local:3003'
    ];

    const ADMIN_HOSTS = [
      'admin3.local:3003'
    ];

    // Check origin
    if (origin && ADMIN_ORIGINS.includes(origin)) {
      return true;
    }

    // Check referer
    if (referer && ADMIN_ORIGINS.some(adminOrigin => referer.startsWith(adminOrigin))) {
      return true;
    }

    // Check host header
    if (host && ADMIN_HOSTS.includes(host)) {
      return true;
    }

    return false;
  }

  static isClientFrontend(req) {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const host = req.headers.host;

    // Regular client frontends - still subject to WAF protections
    const CLIENT_ORIGINS = [
      'http://localhost:3001',
      'http://localhost:3002',
      'http://client1.local:3001',
      'http://client2.local:3002'
    ];

    const CLIENT_HOSTS = [
      'localhost:3001',
      'localhost:3002',
      'client1.local:3001',
      'client2.local:3002'
    ];

    // Check origin
    if (origin && CLIENT_ORIGINS.includes(origin)) {
      return true;
    }

    // Check referer
    if (referer && CLIENT_ORIGINS.some(clientOrigin => referer.startsWith(clientOrigin))) {
      return true;
    }

    // Check host header
    if (host && CLIENT_HOSTS.includes(host)) {
      return true;
    }

    return false;
  }
}

// Helper functions for backward compatibility
function normalizeIP(ip) {
  return WAFCore.normalizeIP(ip);
}

function isTrustedIP(ipAddress) {
  return WAFCore.isTrustedIP(ipAddress);
}

function isAdminFrontend(req) {
  return WAFCore.isAdminFrontend(req);
}

function isClientFrontend(req) {
  return WAFCore.isClientFrontend(req);
}

const firewallMiddleware = async (req, res, next) => {
  try {
    // Extract IP address with proper normalization
    let ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown';

    ipAddress = WAFCore.normalizeIP(ipAddress);

    const userAgent = req.headers['user-agent'] || 'unknown';

    // Check if this is admin frontend - ONLY admin gets complete bypass
    const adminFrontend = WAFCore.isAdminFrontend(req);
    const clientFrontend = WAFCore.isClientFrontend(req);
    const trustedIP = WAFCore.isTrustedIP(ipAddress);

    // Complete WAF bypass ONLY for admin frontend
    if (adminFrontend) {
      console.log(`🟢 Admin frontend request (IP: ${ipAddress}, Origin: ${req.headers.origin || 'none'}) — complete WAF bypass`);
      return next();
    }

    // Generate consistent blocking and rate limiting keys
    const blockingKey = WAFCore.generateBlockingKey(ipAddress, req);
    const rateLimitKey = WAFCore.generateRateLimitKey(ipAddress, req);

    // Enhanced client frontend blocking check
    if (trustedIP && clientFrontend) {
      console.log(`🔍 Client frontend on localhost (IP: ${ipAddress}, Origin: ${req.headers.origin || 'none'}) — checking client-specific blocks`);

      // Check if this specific client frontend is blocked
      const isClientBlocked = await WAFCore.isClientBlocked(ipAddress, req);
      if (isClientBlocked) {
        await WAFCore.logSecurityEvent({
          ipAddress,
          eventType: 'blocked_request',
          severity: 'high',
          description: 'Request from blocked client frontend',
          userAgent,
          requestUrl: req.originalUrl,
          requestMethod: req.method,
          blocked: true,
          origin: req.headers.origin,
          blockingKey
        });

        WAFLogger.warn('Client frontend request blocked', {
          ipAddress,
          origin: req.headers.origin,
          blockingKey,
          userAgent
        });

        return res.status(403).json({
          error: 'Access denied',
          message: 'Your access has been temporarily blocked due to failed login attempts',
          type: 'client_blocked'
        });
      }

      // Apply rate limiting check for client frontends with consistent keys
      if (WAFCore.checkRateLimit(rateLimitKey)) {
        await WAFCore.blockIP(blockingKey, 'rate_limit_exceeded', {
          duration: 60 * 60 * 1000, // 1 hour
          userAgent
        });

        await WAFCore.logSecurityEvent({
          ipAddress,
          eventType: 'rate_limit_exceeded',
          severity: 'medium',
          description: 'Rate limit exceeded by client frontend',
          userAgent,
          requestUrl: req.originalUrl,
          requestMethod: req.method,
          blocked: true,
          origin: req.headers.origin,
          blockingKey,
          rateLimitKey
        });

        WAFLogger.warn('Client frontend rate limit exceeded', {
          ipAddress,
          origin: req.headers.origin,
          blockingKey,
          rateLimitKey
        });

        await sendRateLimitAlert({
          ipAddress,
          rateLimitKey,
          requestUrl: req.originalUrl,
          requestMethod: req.method,
          userAgent,
          origin: req.headers.origin
        });

        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests from this client. Access temporarily blocked.',
          type: 'rate_limit_exceeded'
        });
      }

      // Apply malicious payload check for client frontends using config patterns
      if (req.body && Object.keys(req.body).length > 0) {
        const maliciousCheck = WAFCore.detectMaliciousPayload(req.body);
        if (maliciousCheck.detected) {
          // Block client frontend for malicious patterns with consistent key
          await WAFCore.blockIP(blockingKey, 'malicious_pattern_detected', {
            duration: 2 * 60 * 60 * 1000, // 2 hours for malicious patterns
            userAgent
          });

          await WAFCore.logSecurityEvent({
            ipAddress,
            eventType: 'malicious_pattern',
            severity: maliciousCheck.severity || 'critical',
            description: `Malicious pattern detected from client frontend: ${maliciousCheck.description}`,
            userAgent,
            requestUrl: req.originalUrl,
            requestMethod: req.method,
            payload: maliciousCheck.payload,
            origin: req.headers.origin,
            blocked: true,
            blockingKey,
            patternCategory: maliciousCheck.category
          });

          WAFLogger.critical('Malicious pattern detected from client frontend', {
            ipAddress,
            origin: req.headers.origin,
            pattern: maliciousCheck.pattern,
            description: maliciousCheck.description,
            category: maliciousCheck.category,
            blockingKey
          });

          await sendMaliciousPatternAlert({
            ipAddress,
            pattern: maliciousCheck.pattern,
            description: maliciousCheck.description,
            severity: maliciousCheck.severity,
            category: maliciousCheck.category,
            requestUrl: req.originalUrl,
            userAgent,
            origin: req.headers.origin
          });

          return res.status(403).json({
            error: 'Malicious content detected',
            message: 'Request blocked due to suspicious content. Access temporarily restricted.',
            type: 'malicious_pattern',
            category: maliciousCheck.category
          });
        }
      }

      // Check for suspicious URLs from client frontends using config
      const suspiciousUrlCheck = WAFCore.detectSuspiciousUrl(req.originalUrl);
      if (suspiciousUrlCheck.detected) {
        // Block client frontend for suspicious URL access with dynamic duration from config
        await WAFCore.blockIP(blockingKey, 'suspicious_url_access', {
          duration: suspiciousUrlCheck.blockDuration,
          userAgent
        });

        await WAFCore.logSecurityEvent({
          ipAddress,
          eventType: 'suspicious_url',
          severity: suspiciousUrlCheck.severity,
          description: `Suspicious URL access from client frontend: ${suspiciousUrlCheck.description}`,
          userAgent,
          requestUrl: req.originalUrl,
          requestMethod: req.method,
          origin: req.headers.origin,
          blocked: true,
          blockingKey,
          suspiciousPath: suspiciousUrlCheck.path
        });

        WAFLogger.warn('Suspicious URL access from client frontend', {
          ipAddress,
          origin: req.headers.origin,
          url: req.originalUrl,
          description: suspiciousUrlCheck.description,
          severity: suspiciousUrlCheck.severity,
          blockingKey
        });

        return res.status(403).json({
          error: 'Suspicious URL access',
          message: 'Access to this resource is not allowed. Client temporarily blocked.',
          type: 'suspicious_url',
          severity: suspiciousUrlCheck.severity
        });
      }

      return next();
    }

    // For other localhost requests (not client frontends), give limited protection
    if (trustedIP) {
      console.log(`🔍 Localhost request (IP: ${ipAddress}, Origin: ${req.headers.origin || 'none'}) — applying limited WAF protections`);

      // Apply malicious payload check only using config patterns
      if (req.body && Object.keys(req.body).length > 0) {
        const maliciousCheck = WAFCore.detectMaliciousPayload(req.body);
        if (maliciousCheck.detected) {
          // Block with consistent key (will be just the IP for non-client requests)
          await WAFCore.blockIP(blockingKey, 'malicious_pattern_detected', {
            duration: 2 * 60 * 60 * 1000, // 2 hours
            userAgent
          });

          await WAFCore.logSecurityEvent({
            ipAddress,
            eventType: 'malicious_pattern',
            severity: maliciousCheck.severity || 'critical',
            description: `Malicious pattern detected from localhost: ${maliciousCheck.description}`,
            userAgent,
            requestUrl: req.originalUrl,
            requestMethod: req.method,
            payload: maliciousCheck.payload,
            blocked: true,
            blockingKey,
            patternCategory: maliciousCheck.category
          });

          WAFLogger.critical('Malicious pattern detected from localhost', {
            ipAddress,
            pattern: maliciousCheck.pattern,
            description: maliciousCheck.description,
            category: maliciousCheck.category,
            blockingKey
          });

          return res.status(403).json({
            error: 'Malicious content detected',
            message: 'Request blocked due to suspicious content',
            type: 'malicious_pattern',
            category: maliciousCheck.category
          });
        }
      }

      return next();
    }

    // Apply full WAF protections for external requests using config patterns
    console.log(`🔍 External request (IP: ${ipAddress}, Origin: ${req.headers.origin || 'none'}) — applying full WAF protections`);

    // 1. Check if IP is blocked
    const isBlocked = await WAFCore.isIPBlocked(blockingKey);
    if (isBlocked) {
      await WAFCore.logSecurityEvent({
        ipAddress,
        eventType: 'blocked_request',
        severity: 'high',
        description: 'Request from blocked IP address',
        userAgent,
        requestUrl: req.originalUrl,
        requestMethod: req.method,
        blocked: true,
        blockingKey
      });

      return res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address has been blocked due to suspicious activity',
        type: 'ip_blocked'
      });
    }

    // 2. Rate limiting check
    if (WAFCore.checkRateLimit(rateLimitKey)) {
      await WAFCore.blockIP(blockingKey, 'rate_limit_exceeded', {
        duration: 60 * 60 * 1000, // 1 hour
        userAgent
      });

      await WAFCore.logSecurityEvent({
        ipAddress,
        eventType: 'rate_limit_exceeded',
        severity: 'medium',
        description: 'Rate limit exceeded',
        userAgent,
        requestUrl: req.originalUrl,
        requestMethod: req.method,
        blocked: true,
        blockingKey,
        rateLimitKey
      });

      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. IP temporarily blocked.',
        type: 'rate_limit_exceeded'
      });
    }

    // 3. Check for malicious payload in request body using config patterns
    if (req.body && Object.keys(req.body).length > 0) {
      const maliciousCheck = WAFCore.detectMaliciousPayload(req.body);
      if (maliciousCheck.detected) {
        await WAFCore.blockIP(blockingKey, 'malicious_pattern_detected', {
          duration: 12 * 60 * 60 * 1000, // 12 hours for external malicious traffic
          userAgent
        });

        await WAFCore.logSecurityEvent({
          ipAddress,
          eventType: 'malicious_pattern',
          severity: maliciousCheck.severity || 'critical',
          description: `Malicious pattern detected: ${maliciousCheck.description}`,
          userAgent,
          requestUrl: req.originalUrl,
          requestMethod: req.method,
          payload: maliciousCheck.payload,
          blocked: true,
          blockingKey,
          patternCategory: maliciousCheck.category
        });

        WAFLogger.critical('Malicious pattern detected from external IP', {
          ipAddress,
          pattern: maliciousCheck.pattern,
          description: maliciousCheck.description,
          category: maliciousCheck.category,
          severity: maliciousCheck.severity,
          blockingKey
        });

        return res.status(403).json({
          error: 'Malicious content detected',
          message: 'Request blocked due to suspicious content',
          type: 'malicious_pattern',
          category: maliciousCheck.category
        });
      }
    }

    // 4. Check for suspicious URLs using config and block
    const suspiciousUrlCheck = WAFCore.detectSuspiciousUrl(req.originalUrl);
    if (suspiciousUrlCheck.detected) {
      // Block external IPs for suspicious URL access with config-defined duration
      await WAFCore.blockIP(blockingKey, 'suspicious_url_access', {
        duration: suspiciousUrlCheck.blockDuration,
        userAgent
      });

      await WAFCore.logSecurityEvent({
        ipAddress,
        eventType: 'suspicious_url',
        severity: suspiciousUrlCheck.severity,
        description: `Suspicious URL access: ${suspiciousUrlCheck.description}`,
        userAgent,
        requestUrl: req.originalUrl,
        requestMethod: req.method,
        blocked: true,
        blockingKey,
        suspiciousPath: suspiciousUrlCheck.path
      });

      WAFLogger.warn('Suspicious URL access from external IP', {
        ipAddress,
        url: req.originalUrl,
        description: suspiciousUrlCheck.description,
        severity: suspiciousUrlCheck.severity,
        blockDuration: suspiciousUrlCheck.blockDuration,
        blockingKey
      });

      return res.status(403).json({
        error: 'Suspicious URL access',
        message: 'Access to this resource is not allowed. IP temporarily blocked.',
        type: 'suspicious_url',
        severity: suspiciousUrlCheck.severity
      });
    }

    next();
  } catch (err) {
    WAFLogger.error('Firewall middleware error', {
      error: err.message,
      ipAddress: req.ip,
      url: req.originalUrl
    });
    next(); // Continue on error to avoid breaking the application
  }
};

module.exports = {
  firewallMiddleware,
  WAFCore,
  WAFLogger
};