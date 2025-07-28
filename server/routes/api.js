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
router.use('/subscription', subscriptionRoutes);

// Middleware
const Auth = require('../middleware/Auth');
const { authorize } = require('../middleware/rbacMiddleware'); // Keep authorize as RBAC remains intact

// Removed the router.use debug log here


// ======== THREAT INGESTION ========
router.post('/threats/report', Auth, authorize(...['user', 'admin']), threatController.reportThreat);

// ======== COMPLIANCE TRACKING ========
router.get('/compliance', Auth, authorize(...['user', 'admin']), complianceController.getComplianceItems);
router.post('/compliance/update', Auth, authorize(...['user', 'admin']), complianceController.updateComplianceItem);

// ======== RISK DASHBOARD ========
router.get('/dashboard', Auth, authorize(...['user', 'admin']), dashboardController.getDashboard);

// ======== WAF MANAGEMENT ========
// View WAF dashboard data (GET /waf/dashboard) - Accessible by both user & admin
// Removed inline debug logs for this route
router.get('/waf/dashboard', Auth, authorize(...['user', 'admin']), wafController.getWAFDashboard); // authorize is back and correct

// View WAF security events - Accessible by both user & admin
router.get('/waf/security-events', Auth, authorize(...['user', 'admin']), wafController.getSecurityEvents);

// These actions remain Admin-only (global control)
router.post('/waf/block-ip', Auth, authorize(...['admin']), wafController.blockIP);
router.post('/waf/unblock-ip', Auth, authorize(...['admin']), wafController.unblockIP);


// ======== ASSET MANAGEMENT ========
router.get('/assets', Auth, authorize(...['user', 'admin']), assetController.getAllAssets);
router.post('/assets', Auth, authorize(...['user', 'admin']), assetController.addAsset);
router.put('/assets/:id', Auth, authorize(...['user', 'admin']), assetController.updateAsset);
router.delete('/assets/:id', Auth, authorize(...['user', 'admin']), assetController.deleteAsset);

// ======== INCIDENT REPORTING ========
router.post('/incidents/report', Auth, authorize(...['user', 'admin']), incidentReportController.reportIncident);

module.exports = router;