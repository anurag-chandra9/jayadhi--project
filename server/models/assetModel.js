const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  type:        { type: String, required: true },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Asset', AssetSchema);
