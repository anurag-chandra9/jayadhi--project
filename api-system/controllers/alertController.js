const Alert = require('../models/Alert');

exports.create = async (req, res) => {
  const alert = await Alert.create(req.body);
  res.status(201).json(alert);
};

exports.getAll = async (req, res) => {
  const alerts = await Alert.find().populate('asset');
  res.json(alerts);
};
