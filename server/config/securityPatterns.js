// config/securityPatterns.js

/**
 * WAF Security Patterns Configuration
 * This file contains all malicious patterns and suspicious URLs used by the WAF
 */

const MALICIOUS_PATTERNS = [
  {
    pattern: /(\.\.\/){3,}/i,
    description: 'Directory traversal attempts',
    severity: 'high',
    category: 'path_traversal'
  },
  {
    pattern: /<script[^>]*>.*?<\/script>/gi,
    description: 'XSS script injection attempts',
    severity: 'critical',
    category: 'xss'
  },
  {
    pattern: /union.*select/gi,
    description: 'SQL injection attempts',
    severity: 'critical',
    category: 'sql_injection'
  },
  {
    pattern: /exec\s*\(/gi,
    description: 'Code execution attempts',
    severity: 'critical',
    category: 'code_execution'
  },
  {
    pattern: /eval\s*\(/gi,
    description: 'JavaScript eval attempts',
    severity: 'critical',
    category: 'code_execution'
  },
  {
    pattern: /base64_decode/gi,
    description: 'Base64 decode attempts',
    severity: 'medium',
    category: 'encoding_attack'
  },
  {
    pattern: /system\s*\(/gi,
    description: 'System command execution attempts',
    severity: 'critical',
    category: 'system_command'
  },
  {
    pattern: /\$_(GET|POST|REQUEST|SERVER)\[/gi,
    description: 'PHP global variable access attempts',
    severity: 'high',
    category: 'php_injection'
  },
  // Additional patterns you can add
  {
    pattern: /(?:insert|update|delete|drop|create|alter|truncate)\s+(?:into|table|database)/gi,
    description: 'SQL DDL/DML injection attempts',
    severity: 'critical',
    category: 'sql_injection'
  },
  {
    pattern: /(?:and|or)\s+\d+\s*=\s*\d+/gi,
    description: 'SQL boolean-based injection',
    severity: 'high',
    category: 'sql_injection'
  },
  {
    pattern: /<iframe[^>]*>.*?<\/iframe>/gi,
    description: 'HTML iframe injection attempts',
    severity: 'high',
    category: 'xss'
  },
  {
    pattern: /javascript\s*:/gi,
    description: 'JavaScript protocol injection',
    severity: 'high',
    category: 'xss'
  },
  {
    pattern: /(?:cmd|command)\s*=/gi,
    description: 'Command injection attempts',
    severity: 'critical',
    category: 'command_injection'
  },
  {
    pattern: /(?:wget|curl|nc|netcat)\s+/gi,
    description: 'Network tool usage attempts',
    severity: 'high',
    category: 'network_attack'
  }
];

const SUSPICIOUS_URLS = [
  {
    path: '/admin',
    description: 'Generic admin panel access',
    severity: 'medium',
    block_duration: 30 * 60 * 1000 // 30 minutes
  },
  {
    path: '/wp-admin',
    description: 'WordPress admin panel access',
    severity: 'medium',
    block_duration: 30 * 60 * 1000
  },
  {
    path: '/.env',
    description: 'Environment file access attempt',
    severity: 'high',
    block_duration: 2 * 60 * 60 * 1000 // 2 hours
  },
  {
    path: '/config',
    description: 'Configuration file access',
    severity: 'medium',
    block_duration: 30 * 60 * 1000
  },
  {
    path: '/phpMyAdmin',
    description: 'phpMyAdmin access attempt',
    severity: 'medium',
    block_duration: 30 * 60 * 1000
  },
  // Additional suspicious URLs
  {
    path: '/phpmyadmin',
    description: 'phpMyAdmin access attempt (lowercase)',
    severity: 'medium',
    block_duration: 30 * 60 * 1000
  },
  {
    path: '/pma',
    description: 'phpMyAdmin shorthand access',
    severity: 'medium',
    block_duration: 30 * 60 * 1000
  },
  {
    path: '/mysql',
    description: 'MySQL admin interface access',
    severity: 'medium',
    block_duration: 30 * 60 * 1000
  },
  {
    path: '/wp-login.php',
    description: 'WordPress login page access',
    severity: 'low',
    block_duration: 15 * 60 * 1000 // 15 minutes
  },
  {
    path: '/administrator',
    description: 'Joomla administrator access',
    severity: 'medium',
    block_duration: 30 * 60 * 1000
  },
  {
    path: '/wp-content',
    description: 'WordPress content directory access',
    severity: 'low',
    block_duration: 15 * 60 * 1000
  },
  {
    path: '/backup',
    description: 'Backup directory access',
    severity: 'high',
    block_duration: 60 * 60 * 1000 // 1 hour
  },
  {
    path: '/test',
    description: 'Test directory access',
    severity: 'low',
    block_duration: 15 * 60 * 1000
  },
  {
    path: '/shell',
    description: 'Web shell access attempt',
    severity: 'critical',
    block_duration: 12 * 60 * 60 * 1000 // 12 hours
  },
  {
    path: '/webshell',
    description: 'Web shell access attempt',
    severity: 'critical',
    block_duration: 12 * 60 * 60 * 1000
  }
];

// Helper functions to work with the patterns
const SecurityPatterns = {
  /**
   * Get all malicious patterns as regex objects
   * @returns {Array<RegExp>} Array of compiled regex patterns
   */
  getMaliciousPatterns() {
    return MALICIOUS_PATTERNS.map(item => item.pattern);
  },

  /**
   * Get all suspicious URL paths
   * @returns {Array<string>} Array of suspicious URL paths
   */
  getSuspiciousUrls() {
    return SUSPICIOUS_URLS.map(item => item.path);
  },

  /**
   * Get pattern details by matching against payload
   * @param {string} payload - The payload to check
   * @returns {Object|null} Pattern details if match found
   */
  getMatchingPattern(payload) {
    for (const item of MALICIOUS_PATTERNS) {
      if (item.pattern.test(payload)) {
        return {
          pattern: item.pattern.source,
          description: item.description,
          severity: item.severity,
          category: item.category
        };
      }
    }
    return null;
  },

  /**
   * Get suspicious URL details by path
   * @param {string} url - The URL to check
   * @returns {Object|null} URL details if match found
   */
  getSuspiciousUrlDetails(url) {
    for (const item of SUSPICIOUS_URLS) {
      if (url.includes(item.path)) {
        return {
          path: item.path,
          description: item.description,
          severity: item.severity,
          block_duration: item.block_duration
        };
      }
    }
    return null;
  },

  /**
   * Check if URL is suspicious
   * @param {string} url - The URL to check
   * @returns {boolean} True if suspicious
   */
  isSuspiciousUrl(url) {
    return SUSPICIOUS_URLS.some(item => url.includes(item.path));
  },

  /**
   * Add custom pattern (runtime addition)
   * @param {Object} patternObj - Pattern object with pattern, description, severity, category
   */
  addCustomPattern(patternObj) {
    MALICIOUS_PATTERNS.push(patternObj);
  },

  /**
   * Add custom suspicious URL (runtime addition)
   * @param {Object} urlObj - URL object with path, description, severity, block_duration
   */
  addCustomSuspiciousUrl(urlObj) {
    SUSPICIOUS_URLS.push(urlObj);
  }
};

module.exports = {
  MALICIOUS_PATTERNS,
  SUSPICIOUS_URLS,
  SecurityPatterns
};