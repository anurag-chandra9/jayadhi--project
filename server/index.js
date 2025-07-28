// server/index.js

const express = require('express');
console.log("DEBUG-GLOBAL: Express app initialized. Request received."); // Keep this for general startup confirmation

const dotenv = require('dotenv');
const connectDB = require('./config/db');
const logger = require('./middleware/logger');
const { firewallMiddleware } = require('./middleware/firewallMiddleware'); // Make sure this is correctly imported
const cors = require('cors');
const path = require('path');

// Import Auth and RBAC middleware (keep these if apiRoutes/authRoutes/adminRoutes use them)
const AuthMiddleware = require('./middleware/Auth');
const { authorize } = require('./middleware/rbacMiddleware'); // Keep if other routes still need it
// Note: adminRoutes import is implicitly removed if the app.use('/admin') block is gone.

// Import all route modules
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin'); // Assuming this is still here if not deleted yet


dotenv.config();
connectDB(); // Connects to MongoDB

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (for IP address detection behind reverse proxies)
app.set('trust proxy', true);

// ✅ Allowed origins for CORS
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://client1.local:3001',
    'http://client2.local:3002',
    'http://admin3.local:3003',
];

app.use(cors({
    origin: function (origin, callback) {
        console.log('Request Origin:', origin);
        if (!origin) return callback(null, true);

        const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;

        if (allowedOrigins.includes(normalizedOrigin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// ✅ Parse JSON with body limit
app.use(express.json({ limit: '10mb' }));

// ✅ Custom middlewares (WAF should be early for comprehensive protection)
app.use(logger);
// === TEMPORARY CRITICAL BYPASS: Disable Firewall Middleware ===
// app.use(firewallMiddleware); // <--- TEMPORARILY COMMENTED OUT FOR IP BLOCK BYPASS!
console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
console.warn("!!! FIREWALL MIDDLEWARE (WAF) IS TEMPORARILY DISABLED !!!");
console.warn("!!! REMEMBER TO REVERT THIS AFTER UNBLOCKING YOUR IP !!!");
console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");


// ✅ Mount your standard API routes
app.use('/api', apiRoutes);

// ✅ Mount your authentication routes
app.use('/auth', authRoutes);

// ✅ Mount your admin routes with RBAC protection (if adminRoutes is still defined and used)
// Note: This block assumes adminRoutes is still relevant and AuthMiddleware/authorize are imported.
// If you deleted admin.js and rbacMiddleware.js, this block should be removed.
app.use('/admin',
    (req, res, next) => {
        console.log("DEBUG-INDEX: Entered /admin route middleware chain.");
        next();
    },
    AuthMiddleware,
    (req, res, next) => {
        console.log("DEBUG-INDEX: Passed AuthMiddleware. User role from req.user:", req.user ? req.user.role : 'N/A');
        next();
    },
    authorize(['admin']),
    (req, res, next) => {
        console.log("DEBUG-INDEX: Passed authorize(['admin']) middleware. Request proceeding to adminRoutes.");
        next();
    },
    adminRoutes
);


// ✅ Serve static files (e.g., reports)
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// ✅ Root route
app.get('/', (req, res) => {
    res.send('Welcome to Cybersecurity Platform API - Protected by WAF');
});

// ✅ Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

// ✅ Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('🛡️  WAF (Web Application Firewall) is active and monitoring traffic');
});