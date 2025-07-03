const Threat = require('../models/threatModel');

exports.reportThreat = async (req, res) => {
  try {
    const { threatType, sourceIP, assetId, timestamp, confidenceScore } = req.body;

    const severity = confidenceScore >= 0.8 ? "High" : confidenceScore >= 0.5 ? "Medium" : "Low";

    const threat = new Threat({
      threatType,
      sourceIP,
      assetId,
      timestamp,
      confidenceScore,
      severity
    });

    await threat.save();
    res.status(201).json({ message: 'Threat recorded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
