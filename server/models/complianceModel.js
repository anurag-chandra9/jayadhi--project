const mongoose = require('mongoose');

const ComplianceSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  asset:       { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
  framework:   { type: String, required: true }, // e.g., ISO 27001, CERT-In
  status:      { type: String, enum: ['compliant', 'non-compliant', 'in-progress'], required: true },
  lastChecked: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Compliance', ComplianceSchema);