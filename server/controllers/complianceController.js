const Compliance = require('../models/complianceModel');

// Get all compliance items for the logged-in user
exports.getComplianceItems = async (req, res) => {
  try {
    // req.user is attached by your 'protect' or 'Auth' middleware
    const userId = req.user._id; 
    const items = await Compliance.find({ user: userId }).populate('asset', 'name type'); // Also get asset name and type
    res.status(200).json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a compliance item
exports.updateComplianceItem = async (req, res) => {
  try {
    const { itemId, status } = req.body;
    const userId = req.user._id;

    // Ensure the user can only update their own items
    const item = await Compliance.findOneAndUpdate(
      { _id: itemId, user: userId }, 
      { status },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ message: 'Compliance item not found or you do not have permission to update it.' });
    }
    
    res.status(200).json({ message: 'Compliance item updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};