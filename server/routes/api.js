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
const frameworkController = require('../controllers/frameworkController');
const analyticsController = require('../controllers/analyticsController'); // 1. Import the new controller

router.use('/subscription', subscriptionRoutes);

// Middleware
const { protect } = require('../middleware/protect');
const { authorize } = require('../middleware/rbacMiddleware');

// ======== THREAT INGESTION ========
router.post('/threats/report', protect, authorize('user', 'admin'), threatController.reportThreat);

// ======== COMPLIANCE TRACKING ========
router.get('/compliance', protect, authorize('user', 'admin'), complianceController.getComplianceItems);
router.post('/compliance/update', protect, authorize('user', 'admin'), complianceController.updateComplianceItem);
router.get('/frameworks', protect, frameworkController.getFrameworks);
router.post('/frameworks', protect, frameworkController.createFramework);
router.get('/compliance/status', protect, frameworkController.getUserComplianceStatus);

// ======== RISK DASHBOARD ========
router.get('/dashboard', protect, authorize('user', 'admin'), dashboardController.getDashboard);

// ======== WAF MANAGEMENT ========
router.get('/waf/dashboard', protect, authorize('user', 'admin'), wafController.getWAFDashboard);
router.get('/waf/security-events', protect, authorize('user', 'admin'), wafController.getSecurityEvents);
router.post('/waf/block-ip', protect, authorize('admin'), wafController.blockIP);
router.post('/waf/unblock-ip', protect, authorize('admin'), wafController.unblockIP);

// ======== ASSET MANAGEMENT ========
router.get('/assets', protect, authorize('user', 'admin'), assetController.getAllAssets);
router.post('/assets', protect, authorize('user', 'admin'), assetController.addAsset);
router.put('/assets/:id', protect, authorize('user', 'admin'), assetController.updateAsset);
router.delete('/assets/:id', protect, authorize('user', 'admin'), assetController.deleteAsset);

// ======== INCIDENT REPORTING ========
router.post('/incidents/report', protect, authorize('user', 'admin'), incidentReportController.reportIncident);

// --- 2. ADDED THE NEW ANALYTICS ROUTES HERE ---
// ======== ANALYTICS & REPORTING ========
router.get('/analytics/dashboard', protect, analyticsController.getDashboardAnalytics);
router.get('/analytics/benchmarking', protect, analyticsController.getBenchmarkingData);
router.get('/analytics/forensics', protect, analyticsController.getIncidentForensics);
// ---------------------------------------------

module.exports = router;