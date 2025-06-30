const express = require('express');
const router = express.Router();

// Controllers
const threatController = require('../controllers/threatController');
const complianceController = require('../controllers/complianceController');
const dashboardController = require('../controllers/dashboardController');

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

module.exports = router;