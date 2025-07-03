const Asset = require('../models/assetModel');
const Threat = require('../models/threatModel');
const Compliance = require('../models/complianceModel');

exports.getDashboard = async (req, res) => {
  try {
    const totalAssets = await Asset.countDocuments();
    const highSeverityThreats = await Threat.countDocuments({ severity: 'High' });

    const passed = await Compliance.countDocuments({ status: 'pass' });
    const totalChecks = await Compliance.countDocuments();

    const complianceScore = totalChecks > 0
      ? `${Math.round((passed / totalChecks) * 100)}%`
      : '0%';

    // Risk Logic
    let overallRiskLevel = 'Low';
    const complianceNum = parseInt(complianceScore);

    if (complianceNum < 60 || highSeverityThreats > 10) {
      overallRiskLevel = 'High';
    } else if (complianceNum < 80 || highSeverityThreats > 5) {
      overallRiskLevel = 'Medium';
    }

    res.json({
      totalAssets,
      highSeverityThreats,
      complianceScore,
      overallRiskLevel
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
};
