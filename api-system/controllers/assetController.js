const Asset = require('../models/Asset');

exports.create = async (req, res) => {
  const asset = await Asset.create(req.body);
  res.status(201).json(asset);
};

exports.getAll = async (req, res) => {
  const assets = await Asset.find().populate('assignedTo');
  res.json(assets);
};
