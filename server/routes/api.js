const express = require('express');
const router = express.Router();

// Controllers
const threatController = require('../controllers/threatController');
const complianceController = require('../controllers/complianceController');
const dashboardController = require('../controllers/dashboardController');
const wafController = require('../controllers/wafController');
const assetController = require('../controllers/assetController');
const incidentReportController = require('../controllers/incidentReportController');
const subscriptionRoutes = require('./Subscription');
const rasa = require('./rasa');
const { fileSecurityMiddleware } = require('../middleware/fileSecurityMiddleware');

// Middleware
const Auth = require('../middleware/Auth'); // Assumes Auth middleware handles JWT/Firebase auth

// ======== THREAT INGESTION ========
router.post('/threats/report', Auth, threatController.reportThreat);

// ======== COMPLIANCE TRACKING ========
router.get('/compliance', Auth, complianceController.getComplianceItems);
router.post('/compliance/update', Auth, complianceController.updateComplianceItem);
// If you have file uploads: router.post('/compliance/upload', Auth, uploadMiddleware, complianceController.uploadDocument);

// ======== RISK DASHBOARD ========
router.get('/dashboard', Auth, dashboardController.getDashboard);

// ======== WAF MANAGEMENT (NEW) ========
router.get('/waf/dashboard', Auth, wafController.getWAFDashboard);
router.post('/waf/block-ip', Auth, wafController.blockIP);
router.post('/waf/unblock-ip', Auth, wafController.unblockIP);
router.get('/waf/security-events', Auth, wafController.getSecurityEvents);

// ======== ASSET MANAGEMENT ========
router.get('/assets', Auth, assetController.getAllAssets);
router.post('/assets', Auth, fileSecurityMiddleware, assetController.addAsset);
router.put('/assets/:id', Auth, fileSecurityMiddleware, assetController.updateAsset);
router.delete('/assets/:id', Auth, assetController.deleteAsset);

// New file-related routes
router.get('/assets/:id/download', Auth, assetController.downloadAssetFile);
router.get('/assets/:id/view', assetController.viewAssetFile);
router.delete('/assets/:id/file', Auth, assetController.removeAssetFile);

// ======== INCIDENT REPORTING ========
router.post('/incidents/report', Auth, incidentReportController.reportIncident);

// ======== INCIDENT REPORTING ========
router.use('/subscription', Auth, subscriptionRoutes);

// ======== CHATBOT ========
router.use('/chatbot', rasa);

router.get('/ping', (req, res) => {
    res.json({ message: 'API is alive' });
});

module.exports = router;
