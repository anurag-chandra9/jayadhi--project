const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  name: String,
  type: String,
  status: { type: String, default: 'active' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Asset', assetSchema);
