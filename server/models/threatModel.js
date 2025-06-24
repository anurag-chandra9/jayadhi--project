const mongoose = require('mongoose');

const ThreatSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String },
  severity:    { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  asset:       { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
  reportedAt:  { type: Date, default: Date.now }
});

module.exports = mongoose.model('Threat', ThreatSchema);
