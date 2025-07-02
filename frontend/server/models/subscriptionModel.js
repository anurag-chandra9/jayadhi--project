const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan:        { type: String, required: true }, // e.g., free, pro, enterprise
  startDate:   { type: Date, default: Date.now },
  endDate:     { type: Date },
  isActive:    { type: Boolean, default: true }
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);
