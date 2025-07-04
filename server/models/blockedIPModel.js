const mongoose = require('mongoose');

const BlockedIPSchema = new mongoose.Schema({
  ipAddress: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  reason: { 
    type: String, 
    required: true,
    enum: ['failed_login_attempts', 'malicious_traffic', 'suspicious_activity', 'manual_block']
  },
  blockedAt: { 
    type: Date, 
    default: Date.now 
  },
  expiresAt: { 
    type: Date,
    default: function() {
      // Default block for 24 hours
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  },
  failedAttempts: { 
    type: Number, 
    default: 0 
  },
  isTemporary: { 
    type: Boolean, 
    default: true 
  },
  userAgent: String,
  lastAttempt: { 
    type: Date, 
    default: Date.now 
  }
});

// Index for automatic cleanup of expired temporary blocks
BlockedIPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to check if block is still active
BlockedIPSchema.methods.isActive = function() {
  if (!this.isTemporary) return true;
  return new Date() < this.expiresAt;
};

module.exports = mongoose.model('BlockedIP', BlockedIPSchema);
