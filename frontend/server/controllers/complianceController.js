const Compliance = require('../models/complianceModel');

// Get all compliance items for a user
exports.getComplianceItems = async (req, res) => {
  try {
    const userId = req.user.id;
    const items = await Compliance.find({ user: userId });
    res.status(200).json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a compliance item (e.g., mark as complete)
exports.updateComplianceItem = async (req, res) => {
  try {
    const { itemId, status } = req.body;
    await Compliance.findByIdAndUpdate(itemId, { status });
    res.status(200).json({ message: 'Compliance item updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// (Optional) Upload a document for a compliance item
exports.uploadDocument = async (req, res) => {
  try {
    const { itemId } = req.body;
    const fileUrl = req.file.path; // assuming you're using multer for file uploads
    await Compliance.findByIdAndUpdate(itemId, { documentUrl: fileUrl });
    res.status(200).json({ message: 'Document uploaded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
