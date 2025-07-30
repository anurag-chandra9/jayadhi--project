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
const frameworkController = require('../controllers/frameworkController'); // Import the new controller

router.use('/subscription', subscriptionRoutes);

// Middleware
const { protect } = require('../middleware/protect'); // Correct middleware for app's JWT
const { authorize } = require('../middleware/rbacMiddleware');

// ======== THREAT INGESTION ========
router.post('/threats/report', protect, authorize('user', 'admin'), threatController.reportThreat);

// ======== COMPLIANCE TRACKING (OLD & NEW ROUTES) ========
// Note: The '/compliance' route is now for the old, simpler model.
router.get('/compliance', protect, authorize('user', 'admin'), complianceController.getComplianceItems);
router.post('/compliance/update', protect, authorize('user', 'admin'), complianceController.updateComplianceItem);

// --- FIX APPLIED HERE ---
// NEW ROUTES FOR THE ADVANCED COMPLIANCE MODULE
router.get('/frameworks', protect, frameworkController.getFrameworks);
router.get('/compliance/status', protect, frameworkController.getUserComplianceStatus);
// ------------------------


// ======== RISK DASHBOARD ========
router.get('/dashboard', protect, authorize('user', 'admin'), dashboardController.getDashboard);

// ======== WAF MANAGEMENT ========
// View WAF dashboard data - Accessible by both user & admin
router.get('/waf/dashboard', protect, authorize('user', 'admin'), wafController.getWAFDashboard);

// View WAF security events - Accessible by both user & admin
router.get('/waf/security-events', protect, authorize('user', 'admin'), wafController.getSecurityEvents);

// These actions remain Admin-only
router.post('/waf/block-ip', protect, authorize('admin'), wafController.blockIP);
router.post('/waf/unblock-ip', protect, authorize('admin'), wafController.unblockIP);


// ======== ASSET MANAGEMENT ========
router.get('/assets', protect, authorize('user', 'admin'), assetController.getAllAssets);
router.post('/assets', protect, authorize('user', 'admin'), assetController.addAsset);
router.put('/assets/:id', protect, authorize('user', 'admin'), assetController.updateAsset);
router.delete('/assets/:id', protect, authorize('user', 'admin'), assetController.deleteAsset);

// ======== INCIDENT REPORTING ========
router.post('/incidents/report', protect, authorize('user', 'admin'), incidentReportController.reportIncident);

module.exports = router;
