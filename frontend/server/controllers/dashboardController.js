const Threat = require('../models/threatModel');
const Asset = require('../models/assetModel');
const Compliance = require('../models/complianceModel');

exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;

    const totalAssets = await Asset.countDocuments({ user: userId });
    const highSeverityThreats = await Threat.countDocuments({ user: userId, severity: "High" });

    const totalCompliance = await Compliance.countDocuments({ user: userId });
    const completedCompliance = await Compliance.countDocuments({ user: userId, status: "complete" });

    const complianceScore = totalCompliance > 0 ? (completedCompliance / totalCompliance) * 100 : 0;

    const overallRisk =
      complianceScore < 50 || highSeverityThreats > 3 ? "High" :
      complianceScore < 80 || highSeverityThreats > 1 ? "Medium" :
      "Low";

    res.json({
      totalAssets,
      highSeverityThreats,
      complianceScore: `${Math.round(complianceScore)}%`,
      overallRiskLevel: overallRisk
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
