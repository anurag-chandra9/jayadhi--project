const mongoose = require('mongoose');

const SecurityEventSchema = new mongoose.Schema({
  ipAddress: { 
    type: String, 
    required: true,
    index: true 
  },
  eventType: { 
    type: String, 
    required: true,
    enum: [
      'failed_login', 
      'blocked_request', 
      'suspicious_payload', 
      'rate_limit_exceeded', 
      'malicious_pattern',
      'ip_unblocked',
      'suspicious_url',
      'malicious_pattern_detected',
      'suspicious_url_access',
      // Added the event types from our wafController
      'ip_blocked_manual',
      'ip_unblocked_manual'
    ]
  },
  severity: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical','info'], 
    default: 'medium' 
  },
  description: String,
  userAgent: String,
  requestUrl: String,
  requestMethod: String,
  payload: mongoose.Schema.Types.Mixed,
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  // --- THIS IS THE FIX ---
  // The field name has been changed from 'userId' to 'user'
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  // --------------------
  blocked: { 
    type: Boolean, 
    default: false 
  },
  origin: String,
  blockingKey: String,
  rateLimitKey: String,
  trackingKey: String
});

// TTL index to automatically remove old events after 30 days
SecurityEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Additional indexes for better performance
SecurityEventSchema.index({ eventType: 1, timestamp: -1 });
SecurityEventSchema.index({ severity: 1, timestamp: -1 });
SecurityEventSchema.index({ user: 1, timestamp: -1 }); // Index the new 'user' field

module.exports = mongoose.model('SecurityEvent', SecurityEventSchema);