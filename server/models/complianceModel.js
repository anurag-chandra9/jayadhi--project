const mongoose = require('mongoose');

const ComplianceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  framework: { type: mongoose.Schema.Types.ObjectId, ref: 'Framework', required: true },
  requirement: { type: String, required: true }, // Corresponds to requirementId in the framework model
  status: { 
    type: String, 
    enum: ['compliant', 'non-compliant', 'in-progress', 'not-assessed'], 
    default: 'not-assessed' 
  },
  notes: { type: String },
  lastChecked: { type: Date, default: Date.now }
});

// Create a compound index to ensure a user has only one status per requirement
ComplianceSchema.index({ user: 1, framework: 1, requirement: 1 }, { unique: true });

module.exports = mongoose.model('Compliance', ComplianceSchema);
