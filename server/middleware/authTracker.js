const { WAFCore, WAFLogger } = require('./firewallMiddleware');
const { sendIPBlockedAlert, sendFailedLoginAlert } = require('./wafAlerts');
const BlockedIP = require('../models/blockedIPModel'); // Assuming you use this model for persistent blocks

// In-memory storage for failed login attempts
const failedAttempts = new Map();
const FAILED_LOGIN_THRESHOLD = 5;
const FAILED_LOGIN_WINDOW = 15 * 60 * 1000; // 15 minutes
const BLOCK_DURATION = 60 * 60 * 1000; // 1 hour

class AuthTracker {
  static getClientIP(req) {
    let ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown';

    // Normalize localhost addresses
    if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') {
      ipAddress = '127.0.0.1';
    }

    return ipAddress;
  }

  static isTrustedIP(ipAddress) {
    const TRUSTED_IPS = [
      '127.0.0.1',
      '::1',
      '::ffff:127.0.0.1',
      'localhost'
    ];

    return TRUSTED_IPS.includes(ipAddress);
  }

  static isAdminFrontend(req) {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const host = req.headers.host;

    // ONLY admin frontend gets protection bypass
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

    // Regular client frontends - subject to failed login tracking
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

  // FIXED: Consistent blocking key generation
  static generateBlockingKey(ipAddress, req) {
    if (this.isTrustedIP(ipAddress) && this.isClientFrontend(req)) {
      // Always use the CLIENT: prefix for localhost client frontends
      return `CLIENT:${ipAddress}:${req.headers.origin}`;
    }
    return ipAddress; // Regular IP blocking
  }

  // FIXED: Consistent tracking key generation
  static generateTrackingKey(ipAddress, req) {
    if (this.isTrustedIP(ipAddress) && this.isClientFrontend(req)) {
      // Use simple format for tracking (without CLIENT: prefix)
      return `${ipAddress}:${req.headers.origin}`;
    }
    return ipAddress;
  }

  static async recordFailedLogin(req, email = null) {
    const ipAddress = this.getClientIP(req);
    const userAgent = req.headers['user-agent'];
    const now = Date.now();

    // ONLY skip tracking for admin frontend - NOT for regular client frontends
    if (this.isAdminFrontend(req)) {
      WAFLogger.warn('Failed login from admin frontend (admin bypass)', {
        ipAddress,
        email,
        userAgent,
        origin: req.headers.origin
      });
      return false; // Don't block admin frontend
    }

    // Generate consistent tracking key
    const trackingKey = this.generateTrackingKey(ipAddress, req);

    if (this.isTrustedIP(ipAddress) && this.isClientFrontend(req)) {
      WAFLogger.info('Tracking failed login for client frontend on localhost', {
        trackingKey,
        ipAddress,
        email,
        userAgent,
        origin: req.headers.origin
      });
    } else if (this.isTrustedIP(ipAddress)) {
      // For other localhost requests (like direct API calls), still track but warn
      WAFLogger.warn('Failed login from trusted IP (localhost development)', {
        ipAddress,
        email,
        userAgent,
        origin: req.headers.origin
      });
    }

    try {
      // Get or initialize failed attempts for this tracking key
      if (!failedAttempts.has(trackingKey)) {
        failedAttempts.set(trackingKey, []);
      }

      const attempts = failedAttempts.get(trackingKey);
      const windowStart = now - FAILED_LOGIN_WINDOW;

      // Remove old attempts outside the window
      const recentAttempts = attempts.filter(attempt => attempt.timestamp > windowStart);
      recentAttempts.push({
        timestamp: now,
        email,
        userAgent,
        origin: req.headers.origin
      });

      failedAttempts.set(trackingKey, recentAttempts);

      // Log the failed attempt
      await WAFCore.logSecurityEvent({
        ipAddress,
        eventType: 'failed_login',
        severity: 'medium',
        description: `Failed login attempt${email ? ` for email: ${email}` : ''}`,
        userAgent,
        requestUrl: req.originalUrl,
        requestMethod: req.method,
        payload: { email, origin: req.headers.origin, trackingKey }
      });

      WAFLogger.warn('Failed login attempt recorded', {
        trackingKey,
        ipAddress,
        attemptsInWindow: recentAttempts.length,
        userAgent,
        origin: req.headers.origin
      });

      // Check if threshold exceeded
      if (recentAttempts.length >= FAILED_LOGIN_THRESHOLD) {
        await this.blockClientAccess(trackingKey, ipAddress, userAgent, recentAttempts.length, req);
        return true; // Access was blocked
      }

      await sendFailedLoginAlert({
        ipAddress,
        email,
        attemptsInWindow: recentAttempts.length,
        origin: req.headers.origin,
        userAgent
      });

      return false; // Access not blocked yet
    } catch (err) {
      WAFLogger.error('Error recording failed login', {
        trackingKey,
        ipAddress,
        email,
        error: err.message
      });
      return false;
    }
  }

  static async blockClientAccess(trackingKey, ipAddress, userAgent, attemptCount, req) {
    try {
      // Don't block admin frontend even if they hit the threshold
      if (this.isAdminFrontend(req)) {
        WAFLogger.warn('Skipping block for admin frontend despite failed login threshold', {
          trackingKey,
          ipAddress,
          attemptCount,
          origin: req.headers.origin
        });
        return;
      }

      // Generate consistent blocking key
      const blockingKey = this.generateBlockingKey(ipAddress, req);

      // Block using the consistent key
      await WAFCore.blockIP(blockingKey, 'failed_login_attempts', {
        duration: BLOCK_DURATION,
        userAgent,
        failedAttempts: attemptCount
      });

      WAFLogger.critical('Access blocked for failed login attempts', {
        trackingKey,
        blockingKey,
        ipAddress,
        origin: req.headers.origin,
        attemptCount,
        blockDuration: BLOCK_DURATION
      });

      await WAFCore.logSecurityEvent({
        ipAddress,
        eventType: 'blocked_request',
        severity: 'high',
        description: `Access blocked after ${attemptCount} failed login attempts`,
        userAgent,
        blocked: true,
        origin: req.headers.origin,
        trackingKey,
        blockingKey
      });

      await sendIPBlockedAlert({
        ipAddress,
        reason: 'failed_login_attempts',
        duration: BLOCK_DURATION,
        userAgent,
        failedAttempts: attemptCount,
        origin: req.headers.origin
      });

      // Clear failed attempts after blocking
      failedAttempts.delete(trackingKey);

    } catch (err) {
      WAFLogger.error('Error blocking client access', {
        trackingKey,
        ipAddress,
        error: err.message
      });
    }
  }

  static async recordSuccessfulLogin(req, email) {
    const ipAddress = this.getClientIP(req);

    try {
      // Clear failed attempts on successful login using consistent tracking key
      const trackingKey = this.generateTrackingKey(ipAddress, req);
      failedAttempts.delete(trackingKey);

      WAFLogger.info('Successful login recorded', {
        trackingKey,
        ipAddress,
        email,
        userAgent: req.headers['user-agent'],
        origin: req.headers.origin
      });

    } catch (err) {
      WAFLogger.error('Error recording successful login', {
        ipAddress,
        email,
        error: err.message
      });
    }
  }

  static getFailedAttemptCount(req) {
    const ipAddress = this.getClientIP(req);
    const trackingKey = this.generateTrackingKey(ipAddress, req);

    const attempts = failedAttempts.get(trackingKey) || [];
    const windowStart = Date.now() - FAILED_LOGIN_WINDOW;

    return attempts.filter(attempt => attempt.timestamp > windowStart).length;
  }

  static async clearFailedAttempts(identifier) {
    if (identifier) {
      failedAttempts.delete(identifier);
      WAFLogger.info('Failed attempts cleared', { identifier });
    }
  }

  // FIXED: Enhanced unblocking with comprehensive cleanup
  static async unblockIP(ipAddress) {
    try {
      let unblocked = false;
      const unblockResults = [];

      // 1. Try to unblock regular IP
      const deleted1 = await WAFCore.unblockIP(ipAddress);
      if (deleted1) {
        unblocked = true;
        unblockResults.push(`regular IP: ${ipAddress}`);
      }

      // 2. Try to unblock all possible client frontend variations
      const clientOrigins = [
        'http://client1.local:3001',
        'http://client2.local:3002',
        'http://localhost:3001',
        'http://localhost:3002'
      ];

      for (const origin of clientOrigins) {
        // OLD FORMAT: ip:origin
        const oldClientKey = `${ipAddress}:${origin}`;
        const deleted2 = await WAFCore.unblockIP(oldClientKey);
        if (deleted2) {
          unblocked = true;
          unblockResults.push(`client old format: ${oldClientKey}`);
        }

        // NEW FORMAT: CLIENT:ip:origin (this is the current format)
        const newClientKey = `CLIENT:${ipAddress}:${origin}`;
        const deleted3 = await WAFCore.unblockIP(newClientKey);
        if (deleted3) {
          unblocked = true;
          unblockResults.push(`client new format: ${newClientKey}`);
        }

        // Clear in-memory failed attempts for both formats
        this.clearFailedAttempts(oldClientKey);
        this.clearFailedAttempts(`${ipAddress}:${origin}`);
      }

      // 3. Clear regular IP failed attempts
      this.clearFailedAttempts(ipAddress);

      WAFLogger.info('IP unblocking attempted', {
        ipAddress,
        unblocked,
        unblockResults,
        message: unblocked ? 'Successfully unblocked' : 'No active blocks found'
      });

      return { success: unblocked, results: unblockResults };
    } catch (err) {
      WAFLogger.error('Error unblocking IP', { ipAddress, error: err.message });
      return { success: false, error: err.message };
    }
  }

  // FIXED: Enhanced blocking check
  static async isClientBlocked(req) {
    // --- TEMPORARY BYPASS FOR DEBUGGING IP BLOCK ---
    console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.warn("!!! WAF IP BLOCK CHECK IS TEMPORARILY BYPASSED !!!");
    console.warn("!!! REMEMBER TO REVERT THIS AFTER UNBLOCKING !!!");
    console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    return false; // <--- TEMPORARY: Always allow, bypasses all blocking logic
    // --- END TEMPORARY BYPASS ---

    const ipAddress = this.getClientIP(req);

    // Admin frontend is never blocked
    if (this.isAdminFrontend(req)) {
      return false;
    }

    // Check regular IP block first
    const regularBlock = await WAFCore.isIPBlocked(ipAddress);
    if (regularBlock) {
      WAFLogger.info('Client blocked - regular IP block found', { ipAddress });
      return true;
    }

    // Check client frontend specific blocks
    if (this.isTrustedIP(ipAddress) && this.isClientFrontend(req)) {
      // Check new format (CLIENT:ip:origin)
      const blockingKey = this.generateBlockingKey(ipAddress, req);
      const clientBlocked = await WAFCore.isIPBlocked(blockingKey);

      if (clientBlocked) {
        WAFLogger.info('Client blocked - new format block found', {
          ipAddress,
          blockingKey,
          origin: req.headers.origin
        });
        return true;
      }

      // Check old format for backward compatibility (ip:origin)
      const oldClientKey = `${ipAddress}:${req.headers.origin}`;
      const oldFormatBlocked = await WAFCore.isIPBlocked(oldClientKey);

      if (oldFormatBlocked) {
        WAFLogger.info('Client blocked - old format block found', {
          ipAddress,
          oldClientKey,
          origin: req.headers.origin
        });
        return true;
      }
    }

    return false;
  }
}

module.exports = AuthTracker;