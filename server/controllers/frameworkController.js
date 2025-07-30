const Framework = require('../models/frameworkModel');
const Compliance = require('../models/complianceModel');

// Get all available frameworks
exports.getFrameworks = async (req, res) => {
  try {
    const frameworks = await Framework.find({});
    res.status(200).json(frameworks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new custom framework
exports.createFramework = async (req, res) => {
  try {
    // Destructure the new fields from the request body
    const { name, code, description, tags, requirements } = req.body;
    
    const newFramework = new Framework({
      name,
      code,
      description,
      tags, // Add tags
      requirements,
      isDefault: false // Custom frameworks are not default
    });

    const savedFramework = await newFramework.save();
    res.status(201).json(savedFramework);
  } catch (err) {
    if (err.code === 11000) {
        return res.status(400).json({ message: 'A framework with this name or code already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
};


// Get a user's compliance status for all frameworks
exports.getUserComplianceStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const statuses = await Compliance.find({ user: userId });
    res.status(200).json(statuses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
