const express = require('express');
const router = express.Router();

// Controllers
const threatController = require('../controllers/threatController');
const complianceController = require('../controllers/complianceController');
const dashboardController = require('../controllers/dashboardController');
const wafController = require('../controllers/wafController'); // NEW

// Middleware
const Auth = require('../middleware/Auth'); // Assumes Auth middleware handles JWT/Firebase auth

// ======== THREAT INGESTION ========
router.post('/threats/report', Auth, threatController.reportThreat);

// ======== COMPLIANCE TRACKING ========
router.get('/compliance', Auth, complianceController.getComplianceItems);
router.post('/compliance/update', Auth, complianceController.updateComplianceItem);
// If you have file uploads: router.post('/compliance/upload', Auth, uploadMiddleware, complianceController.uploadDocument);

// ======== RISK DASHBOARD ========
router.get('/dashboard', Auth, dashboardController.getDashboardData);

// ======== WAF MANAGEMENT (NEW) ========
router.get('/waf/dashboard', Auth, wafController.getWAFDashboard);
router.post('/waf/block-ip', Auth, wafController.blockIP);
router.post('/waf/unblock-ip', Auth, wafController.unblockIP);
router.get('/waf/security-events', Auth, wafController.getSecurityEvents);

module.exports = router;