const Asset = require('../../server/models/assetModel');

async function resolveAssetIdByTargetIP(targetIP) {
  try {
    const asset = await Asset.findOne({ ip: targetIP });
    return asset?._id || null;
  } catch (err) {
    console.error('[Resolve Asset Error]', err);
    return null;
  }
}

module.exports = resolveAssetIdByTargetIP;