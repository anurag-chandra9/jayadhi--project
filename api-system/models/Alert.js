const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  message: String,
  level: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  timestamp: { type: Date, default: Date.now },
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' }
});

module.exports = mongoose.model('Alert', alertSchema);
