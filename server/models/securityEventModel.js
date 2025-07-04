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
      'suspicious_url_access'
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
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  blocked: { 
    type: Boolean, 
    default: false 
  },
  // Additional fields for enhanced tracking
  origin: String, // Client origin
  blockingKey: String, // The key used for blocking
  rateLimitKey: String, // The key used for rate limiting
  trackingKey: String // The key used for tracking
});

// TTL index to automatically remove old events after 30 days
SecurityEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Additional indexes for better performance
SecurityEventSchema.index({ eventType: 1, timestamp: -1 });
SecurityEventSchema.index({ severity: 1, timestamp: -1 });
SecurityEventSchema.index({ blocked: 1, timestamp: -1 });

module.exports = mongoose.model('SecurityEvent', SecurityEventSchema);