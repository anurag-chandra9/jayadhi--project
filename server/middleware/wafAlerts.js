require('dotenv').config(); // ✅ Load environment variables
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Email configuration
const EMAIL_CONFIG = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS // Use App Password for Gmail
  }
};

// Default admin email if no logged-in admin found
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL;

// In-memory storage for admin sessions (could be replaced with Redis/DB)
const adminSessions = new Map();

class WAFAlertSystem {
  constructor() {
    this.transporter = nodemailer.createTransport(EMAIL_CONFIG);
    this.logPath = path.join(__dirname, '../logs/alerts.log');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  // Store admin email when they log in from admin frontend
  static setAdminSession(sessionId, adminEmail) {
    adminSessions.set(sessionId, {
      email: adminEmail,
      loginTime: new Date(),
      lastActivity: new Date()
    });
    console.log(`[Alert System] Admin session stored: ${adminEmail}`);
  }

  // Get current admin email from active sessions
  static getCurrentAdminEmail() {
    try {
      // Get the most recently active admin
      let latestAdmin = null;
      let latestTime = 0;

      for (const [sessionId, sessionData] of adminSessions.entries()) {
        if (sessionData.lastActivity.getTime() > latestTime) {
          latestTime = sessionData.lastActivity.getTime();
          latestAdmin = sessionData.email;
        }
      }

      // Return the most recent admin or default
      return latestAdmin || DEFAULT_ADMIN_EMAIL;
    } catch (error) {
      console.error('[Alert System] Error getting admin email:', error.message);
      return DEFAULT_ADMIN_EMAIL;
    }
  }

  // Update admin activity timestamp
  static updateAdminActivity(sessionId) {
    if (adminSessions.has(sessionId)) {
      adminSessions.get(sessionId).lastActivity = new Date();
    }
  }

  // Clean up old admin sessions (call periodically)
  static cleanupOldSessions() {
    const now = Date.now();
    const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours

    for (const [sessionId, sessionData] of adminSessions.entries()) {
      if (now - sessionData.lastActivity.getTime() > SESSION_TIMEOUT) {
        adminSessions.delete(sessionId);
        console.log(`[Alert System] Cleaned up old admin session: ${sessionData.email}`);
      }
    }
  }

  async logAlert(alertData) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        ...alertData
      };
      fs.appendFileSync(this.logPath, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('[Alert System] Logging error:', error.message);
    }
  }

  async sendAlert(alertType, alertData) {
    const emailAlertsEnabled = process.env.ENABLE_EMAIL_ALERTS === 'true';

    // Always log the alert even if email is disabled
    await this.logAlert({
      type: alertType,
      status: emailAlertsEnabled ? 'sending' : 'skipped',
      ...alertData
    });

    if (!emailAlertsEnabled) {
      console.log(`[Alert Skipped] Email alert suppressed for ${alertType}`);
      return false;
    }

    try {
      const adminEmail = WAFAlertSystem.getCurrentAdminEmail();
      const subject = this.generateSubject(alertType, alertData);
      const message = this.generateMessage(alertType, alertData);

      const mailOptions = {
        from: '"CyberSentinel WAF Alert System" <niranjanmemane47@gmail.com>',
        to: adminEmail,
        subject,
        text: message,
        html: this.generateHTMLMessage(alertType, alertData)
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log(`[Alert Sent] ${alertType} alert sent to ${adminEmail}`);

      // Log the alert
      await this.logAlert({
        type: alertType,
        recipient: adminEmail,
        subject,
        status: 'sent',
        messageId: info.messageId,
        ...alertData
      });

      return true;
    } catch (error) {
      console.error('[Alert Error]', error.message);

      // Log failed alert
      await this.logAlert({
        type: alertType,
        status: 'failed',
        error: error.message,
        ...alertData
      });

      return false;
    }
  }


  generateSubject(alertType, data) {
    const subjects = {
      'ip_blocked': `🚨 WAF Alert: IP Blocked - ${data.ipAddress}`,
      'malicious_pattern': `⚠️ WAF Alert: Malicious Pattern Detected - ${data.ipAddress}`,
      'rate_limit_exceeded': `🔄 WAF Alert: Rate Limit Exceeded - ${data.ipAddress}`,
      'suspicious_url': `🔍 WAF Alert: Suspicious URL Access - ${data.ipAddress}`,
      'failed_login_attempts': `🔐 WAF Alert: Multiple Failed Logins - ${data.ipAddress}`,
      'security_event': `🛡️ WAF Alert: Security Event - ${data.eventType}`,
      'malicious_file_upload': `🔍 WAF Alert: Malicious File Upload Blocked - ${data.ipAddress}` // NEW
    };

    return subjects[alertType] || `🚨 WAF Alert: ${alertType}`;
  }

  generateMessage(alertType, data) {
    const timestamp = new Date().toLocaleString();

    let message = `WAF Security Alert\n`;
    message += `===================\n\n`;
    message += `Alert Type: ${alertType.toUpperCase()}\n`;
    message += `Timestamp: ${timestamp}\n`;
    message += `IP Address: ${data.ipAddress || 'Unknown'}\n\n`;

    switch (alertType) {
      case 'ip_blocked':
        message += `Reason: ${data.reason}\n`;
        message += `Duration: ${this.formatDuration(data.duration)}\n`;
        message += `User Agent: ${data.userAgent || 'Unknown'}\n`;
        message += `Failed Attempts: ${data.failedAttempts || 'N/A'}\n`;
        break;

      case 'malicious_pattern':
        message += `Pattern: ${data.pattern || 'Unknown'}\n`;
        message += `Description: ${data.description}\n`;
        message += `Severity: ${data.severity}\n`;
        message += `Category: ${data.category}\n`;
        message += `Request URL: ${data.requestUrl}\n`;
        break;

      case 'rate_limit_exceeded':
        message += `Rate Limit Key: ${data.rateLimitKey}\n`;
        message += `Request URL: ${data.requestUrl}\n`;
        message += `Request Method: ${data.requestMethod}\n`;
        break;

      case 'suspicious_url':
        message += `Suspicious Path: ${data.suspiciousPath}\n`;
        message += `Description: ${data.description}\n`;
        message += `Severity: ${data.severity}\n`;
        message += `Request URL: ${data.requestUrl}\n`;
        break;

      case 'failed_login_attempts':
        message += `Email Attempted: ${data.email || 'Unknown'}\n`;
        message += `Attempts in Window: ${data.attemptsInWindow}\n`;
        message += `Origin: ${data.origin}\n`;
        break;

      case 'malicious_file_upload':
        message += `File Name: ${data.fileName}\n`;
        message += `Reason: ${data.reason}\n`;
        message += `Quarantine Path: ${data.quarantinePath}\n`;
        message += `User Agent: ${data.userAgent || 'Unknown'}\n`;
        break;

      default:
        message += `Event: ${data.eventType || alertType}\n`;
        message += `Description: ${data.description || 'No description available'}\n`;
    }

    message += `\nOrigin: ${data.origin || 'Unknown'}\n`;
    message += `User Agent: ${data.userAgent || 'Unknown'}\n\n`;
    message += `This is an automated alert from the CyberSentinel WAF System.\n`;
    message += `Please investigate this activity promptly.\n`;

    return message;
  }

  generateHTMLMessage(alertType, data) {
    const timestamp = new Date().toLocaleString();
    const severityColor = this.getSeverityColor(data.severity || 'medium');

    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #dc3545; margin: 0;">🚨 WAF Security Alert</h2>
        <p style="color: #6c757d; margin: 5px 0;">CyberSentinel Web Application Firewall</p>
      </div>
      
      <div style="background: white; padding: 20px; border: 1px solid #dee2e6; margin-top: 10px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Alert Type:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">
              <span style="background: ${severityColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                ${alertType.toUpperCase()}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Timestamp:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${timestamp}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">IP Address:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace;">${data.ipAddress || 'Unknown'}</td>
          </tr>
          ${data.reason ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Reason:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.reason}</td></tr>` : ''}
          ${data.description ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Description:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.description}</td></tr>` : ''}
          ${data.requestUrl ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Request URL:</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace;">${data.requestUrl}</td></tr>` : ''}
          ${data.origin ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Origin:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.origin}</td></tr>` : ''}
        </table>
      </div>
      
      <div style="background: #e9ecef; padding: 15px; margin-top: 10px; border-radius: 4px; font-size: 14px; color: #495057;">
        <strong>⚠️ Action Required:</strong> Please investigate this security event promptly. 
        This is an automated alert from the CyberSentinel WAF System.
      </div>
    </div>`;
  }

  getSeverityColor(severity) {
    const colors = {
      'low': '#28a745',
      'medium': '#ffc107',
      'high': '#fd7e14',
      'critical': '#dc3545'
    };
    return colors[severity] || '#6c757d';
  }

  formatDuration(milliseconds) {
    if (!milliseconds) return 'Unknown';

    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''}` : ''}`;
    }
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}

// Create singleton instance
const alertSystem = new WAFAlertSystem();

// Cleanup old sessions every hour
setInterval(() => {
  WAFAlertSystem.cleanupOldSessions();
}, 60 * 60 * 1000);

// Convenience functions for different alert types
const sendIPBlockedAlert = (data) => alertSystem.sendAlert('ip_blocked', data);
const sendMaliciousPatternAlert = (data) => alertSystem.sendAlert('malicious_pattern', data);
const sendRateLimitAlert = (data) => alertSystem.sendAlert('rate_limit_exceeded', data);
const sendSuspiciousURLAlert = (data) => alertSystem.sendAlert('suspicious_url', data);
const sendFailedLoginAlert = (data) => alertSystem.sendAlert('failed_login_attempts', data);
const sendSecurityEventAlert = (data) => alertSystem.sendAlert('security_event', data);

module.exports = {
  WAFAlertSystem,
  sendIPBlockedAlert,
  sendMaliciousPatternAlert,
  sendRateLimitAlert,
  sendSuspiciousURLAlert,
  sendFailedLoginAlert,
  sendSecurityEventAlert,

  // Generic function
  sendAlert: (type, data) => alertSystem.sendAlert(type, data),

  // Session management functions
  setAdminSession: WAFAlertSystem.setAdminSession,
  updateAdminActivity: WAFAlertSystem.updateAdminActivity,
  getCurrentAdminEmail: WAFAlertSystem.getCurrentAdminEmail
};
