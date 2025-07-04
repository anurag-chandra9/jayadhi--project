const Asset = require('../models/assetModel');
const User = require('../models/userModel'); // ✅ Required to resolve Firebase UID to ObjectId

// Get all assets
exports.getAllAssets = async (req, res) => {
  try {
    const assets = await Asset.find().populate('owner', 'email'); // Optional: populate owner info
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
};

// Add new asset
exports.addAsset = async (req, res) => {
  try {
    const { name, type, value, description, owner } = req.body;

    if (!owner) {
      return res.status(400).json({ error: 'Missing owner Firebase UID' });
    }

    // 🔁 Convert Firebase UID to MongoDB ObjectId
    const user = await User.findOne({ firebaseUid: owner });
    if (!user) {
      return res.status(400).json({ error: 'User not found for Firebase UID' });
    }

    const newAsset = new Asset({
      name,
      type,
      value, // ✅ ADD THIS!
      description,
      owner: user._id,
    });

    const savedAsset = await newAsset.save();
    res.status(201).json(savedAsset);
  } catch (err) {
    console.error('Error adding asset:', err.message);
    res.status(400).json({ error: 'Failed to add asset', details: err.message });
  }
};


// Update asset
exports.updateAsset = async (req, res) => {
  try {
    const { owner, ...rest } = req.body;

    // Convert Firebase UID to MongoDB ObjectId
    const user = await User.findOne({ firebaseUid: owner });
    if (!user) {
      return res.status(400).json({ error: 'User not found for Firebase UID' });
    }

    const updatedAsset = await Asset.findByIdAndUpdate(
      req.params.id,
      { ...rest, owner: user._id },
      { new: true }
    );

    res.json(updatedAsset);
  } catch (err) {
    console.error("Update asset error:", err.message);
    res.status(400).json({ error: 'Failed to update asset', details: err.message });
  }
};


// Delete asset
exports.deleteAsset = async (req, res) => {
  try {
    await Asset.findByIdAndDelete(req.params.id);
    res.json({ message: 'Asset deleted' });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete asset' });
  }
};
