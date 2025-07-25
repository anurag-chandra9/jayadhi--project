const Asset = require('../models/assetModel');
const { WAFLogger } = require('../middleware/firewallMiddleware');
const { FileSecurityScanner } = require('../middleware/fileSecurityMiddleware');
const path = require('path');

const assetController = {
  async getAllAssets(req, res) {
    try {
      const assets = await Asset.find({ owner: req.user.uid }).sort({ createdAt: -1 });
      res.json(assets);
    } catch (error) {
      WAFLogger.error('Error fetching assets', {
        error: error.message,
        userId: req.user?.uid
      });
      res.status(500).json({ error: 'Failed to fetch assets' });
    }
  },

  async addAsset(req, res) {
    try {
      // For multipart form data, req.body might be undefined initially
      // The fileSecurityMiddleware using multer will populate req.body
      console.log('📝 Request body:', req.body);
      console.log('📎 Request file:', req.file);
      console.log('🔒 Secure file info:', req.secureFile);

      // Extract data from request - handle both JSON and form data
      const { name, type, value, description, owner } = req.body || {};

      // Validate required fields
      if (!name || !type || value === undefined || value === null) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Name, type, and value are required fields',
          received: { name, type, value }
        });
      }

      // Create asset data
      const assetData = {
        name: name.trim(),
        type: type.trim(),
        value: parseFloat(value),
        description: description ? description.trim() : '',
        owner: owner || req.user.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add file information if file was uploaded and scanned successfully
      if (req.secureFile) {
        assetData.hasFile = true;
        assetData.file = {
          originalName: req.secureFile.originalName,
          secureFileName: req.secureFile.secureFileName,
          mimeType: req.secureFile.mimeType,
          fileSize: req.secureFile.size,
          isViewable: req.secureFile.isViewable,
          uploadedAt: new Date()
        };

        WAFLogger.info('Asset created with secure file', {
          assetName: assetData.name,
          fileName: req.secureFile.originalName,
          fileSize: req.secureFile.size,
          userId: req.user.uid
        });
      } else {
        assetData.hasFile = false;
        assetData.file = null;
      }

      // Create and save asset
      const asset = new Asset(assetData);
      await asset.save();

      WAFLogger.info('Asset created successfully', {
        assetId: asset._id,
        assetName: asset.name,
        hasFile: asset.hasFile,
        userId: req.user.uid
      });

      res.status(201).json(asset);

    } catch (error) {
      WAFLogger.error('Error adding asset', {
        error: error.message,
        userId: req.user?.uid,
        body: req.body
      });

      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }));
        return res.status(400).json({
          error: 'Validation failed',
          details: validationErrors
        });
      }

      res.status(500).json({
        error: 'Failed to add asset',
        message: error.message
      });
    }
  },

  async updateAsset(req, res) {
    try {
      const { id } = req.params;
      const { name, type, value, description } = req.body || {};

      // Find existing asset
      const existingAsset = await Asset.findOne({ _id: id, owner: req.user.uid });
      if (!existingAsset) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      // Prepare update data
      const updateData = {
        updatedAt: new Date()
      };

      // Update basic fields if provided
      if (name !== undefined) updateData.name = name.trim();
      if (type !== undefined) updateData.type = type.trim();
      if (value !== undefined) updateData.value = parseFloat(value);
      if (description !== undefined) updateData.description = description.trim();

      // Handle file update if new file was uploaded
      if (req.secureFile) {
        updateData.hasFile = true;
        updateData.file = {
          originalName: req.secureFile.originalName,
          secureFileName: req.secureFile.secureFileName,
          mimeType: req.secureFile.mimeType,
          fileSize: req.secureFile.size,
          isViewable: req.secureFile.isViewable,
          uploadedAt: new Date()
        };

        WAFLogger.info('Asset updated with new secure file', {
          assetId: id,
          fileName: req.secureFile.originalName,
          fileSize: req.secureFile.size,
          userId: req.user.uid
        });
      }

      // Update asset
      const updatedAsset = await Asset.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true
      });

      WAFLogger.info('Asset updated successfully', {
        assetId: id,
        hasNewFile: !!req.secureFile,
        userId: req.user.uid
      });

      res.json(updatedAsset);

    } catch (error) {
      WAFLogger.error('Error updating asset', {
        error: error.message,
        assetId: req.params.id,
        userId: req.user?.uid
      });

      if (error.name === 'ValidationError') {
        const validationErrors = Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }));
        return res.status(400).json({
          error: 'Validation failed',
          details: validationErrors
        });
      }

      res.status(500).json({
        error: 'Failed to update asset',
        message: error.message
      });
    }
  },

  async deleteAsset(req, res) {
    try {
      const { id } = req.params;

      const asset = await Asset.findOneAndDelete({ _id: id, owner: req.user.uid });
      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      WAFLogger.info('Asset deleted successfully', {
        assetId: id,
        assetName: asset.name,
        hadFile: asset.hasFile,
        userId: req.user.uid
      });

      res.json({ message: 'Asset deleted successfully' });
    } catch (error) {
      WAFLogger.error('Error deleting asset', {
        error: error.message,
        assetId: req.params.id,
        userId: req.user?.uid
      });
      res.status(500).json({ error: 'Failed to delete asset' });
    }
  },

  async downloadAssetFile(req, res) {
    try {
      const { id } = req.params;

      const asset = await Asset.findOne({ _id: id, owner: req.user.uid });
      if (!asset || !asset.hasFile) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Decrypt and serve file
      const fileBuffer = await FileSecurityScanner.decryptFile(asset.file.secureFileName);

      res.set({
        'Content-Type': asset.file.mimeType,
        'Content-Disposition': `attachment; filename="${asset.file.originalName}"`,
        'Content-Length': fileBuffer.length
      });

      WAFLogger.info('File downloaded', {
        assetId: id,
        fileName: asset.file.originalName,
        userId: req.user.uid
      });

      res.end(fileBuffer);

    } catch (error) {
      WAFLogger.error('Error downloading file', {
        error: error.message,
        assetId: req.params.id,
        userId: req.user?.uid
      });
      res.status(500).json({ error: 'Failed to download file' });
    }
  },

  async viewAssetFile(req, res) {
    try {
      const { id } = req.params;

      const asset = await Asset.findById(id);
      if (!asset || !asset.hasFile) {
        return res.status(404).json({ error: 'File not found' });
      }

      const mime = asset.file.mimeType;
      const viewableTypes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/gif',
        'image/webp',
        'image/bmp',
        'text/plain',
        'text/csv',
        'application/json',
        'application/xml',
        'text/xml'
      ];

      if (!asset.file.isViewable || !viewableTypes.includes(mime)) {
        return res.status(400).json({ error: 'File type not viewable in browser' });
      }

      console.log('📄 Viewing file with MIME:', mime);

      const fileBuffer = await FileSecurityScanner.decryptFile(asset.file.secureFileName);

      if (!fileBuffer || fileBuffer.length === 0) {
        return res.status(500).send('File is empty or corrupted.');
      }

      res.set({
        'Content-Type': mime,
        'Content-Disposition': `inline; filename="${asset.file.originalName}"`,
        'Content-Length': fileBuffer.length
      });

      WAFLogger.info('File viewed', {
        assetId: id,
        fileName: asset.file.originalName,
        userId: req.user?.uid || 'guest'
      });

      res.end(fileBuffer); // ✅ Important
    } catch (error) {
      WAFLogger.error('Error viewing file', {
        error: error.message,
        assetId: req.params.id,
        userId: req.user?.uid || 'guest'
      });
      res.status(500).json({ error: 'Failed to view file' });
    }
  },

  async removeAssetFile(req, res) {
    try {
      const { id } = req.params;

      const asset = await Asset.findOne({ _id: id, owner: req.user.uid });
      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      if (!asset.hasFile) {
        return res.status(400).json({ error: 'Asset has no file to remove' });
      }

      // Update asset to remove file reference
      const updatedAsset = await Asset.findByIdAndUpdate(id, {
        hasFile: false,
        file: null,
        updatedAt: new Date()
      }, { new: true });

      WAFLogger.info('File removed from asset', {
        assetId: id,
        fileName: asset.file.originalName,
        userId: req.user.uid
      });

      res.json(updatedAsset);

    } catch (error) {
      WAFLogger.error('Error removing file', {
        error: error.message,
        assetId: req.params.id,
        userId: req.user?.uid
      });
      res.status(500).json({ error: 'Failed to remove file' });
    }
  }
};

module.exports = assetController;