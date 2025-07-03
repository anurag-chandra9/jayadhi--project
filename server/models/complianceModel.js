const mongoose = require('mongoose');

const ComplianceSchema = new mongoose.Schema({
  framework:   { type: String, required: true }, // e.g., ISO 27001, GDPR
  status:      { type: String, enum: ['compliant', 'non-compliant', 'in-progress'], required: true },
  asset:       { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
  lastChecked: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Compliance', ComplianceSchema);
