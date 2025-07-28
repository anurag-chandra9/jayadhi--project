const express = require('express');
const router = express.Router();

// Controllers
const threatController = require('../controllers/threatController');
const complianceController = require('../controllers/complianceController');
const dashboardController = require('../controllers/dashboardController');
const wafController = require('../controllers/wafController'); // NEW
const assetController = require('../controllers/assetController');
const incidentReportController = require('../controllers/incidentReportController'); // NEW
const subscriptionRoutes = require('./Subscription');
router.use('/subscription', subscriptionRoutes);

// Middleware
const Auth = require('../middleware/Auth');
const { authorize } = require('../middleware/rbacMiddleware');

// === NEW DEBUG LOG: Confirm if api.js router is processing requests ===
router.use((req, res, next) => {
    console.log(`API_ROUTER_DEBUG: Request hit api.js router: ${req.method} ${req.originalUrl}`);
    next();
});

// ======== THREAT INGESTION ========
router.post('/threats/report', Auth, authorize(['user', 'admin']), threatController.reportThreat);

// ======== COMPLIANCE TRACKING ========
router.get('/compliance', Auth, authorize(['user', 'admin']), complianceController.getComplianceItems);
router.post('/compliance/update', Auth, authorize(['user', 'admin']), complianceController.updateComplianceItem);

// ======== RISK DASHBOARD ========
router.get('/dashboard', Auth, authorize(['user', 'admin']), dashboardController.getDashboard);

// ======== WAF MANAGEMENT (NEW) ========
// NEW: View WAF dashboard data (e.g., blocked IPs relevant to their tenant) - Accessible by both user & admin
// === CRITICAL DEBUG: Inline logs for /waf/dashboard ===
router.get('/waf/dashboard',
    (req, res, next) => {
        console.log("API_ROUTER_DEBUG: /waf/dashboard route matched. Entering middleware chain.");
        next();
    },
    Auth, // Verifies token and attaches req.user
    (req, res, next) => {
        console.log("API_ROUTER_DEBUG: /waf/dashboard passed Auth middleware. User role:", req.user ? req.user.role : 'N/A');
        next();
    },
    // authorize(['user', 'admin']), // <--- CRITICAL: TEMPORARILY COMMENT THIS LINE OUT!
    (req, res, next) => { // This log will confirm the bypass
        console.log("API_ROUTER_DEBUG: /waf/dashboard skipping authorize middleware for debug. Proceeding to controller.");
        next();
    },
    wafController.getWAFDashboard // The actual controller function
);

// NEW: View WAF security events - Accessible by both user & admin
router.get('/waf/security-events', Auth, authorize(['user', 'admin']), wafController.getSecurityEvents);

// These actions remain Admin-only (global control)
router.post('/waf/block-ip', Auth, authorize(['admin']), wafController.blockIP);
router.post('/waf/unblock-ip', Auth, authorize(['admin']), wafController.unblockIP);


// ======== ASSET MANAGEMENT ========
router.get('/assets', Auth, authorize(['user', 'admin']), assetController.getAllAssets);
router.post('/assets', Auth, authorize(['user', 'admin']), assetController.addAsset);
router.put('/assets/:id', Auth, authorize(['user', 'admin']), assetController.updateAsset);
router.delete('/assets/:id', Auth, authorize(['user', 'admin']), assetController.deleteAsset);

// ======== INCIDENT REPORTING ========
router.post('/incidents/report', Auth, authorize(['user', 'admin']), incidentReportController.reportIncident);

module.exports = router;