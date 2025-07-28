// server/index.js

// === NEW LOG: Very first log to see if any request enters Express app ===
const express = require('express');
console.log("DEBUG-GLOBAL: Express app initialized. Request received.");

const dotenv = require('dotenv');
const connectDB = require('./config/db');
const logger = require('./middleware/logger');
const { firewallMiddleware } = require('./middleware/firewallMiddleware');
const cors = require('cors');
const path = require('path');

// === NEW/UPDATED: Import components needed for direct route testing/setup ===
const AuthMiddleware = require('./middleware/Auth');
const { authorize } = require('./middleware/rbacMiddleware');

// === NEW/UPDATED: Import standard API and Auth routes ===
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin'); // Import the admin routes


dotenv.config();
connectDB();

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
// === TEMPORARY CRITICAL BYPASS: Disable Firewall Middleware to debug 404 ===
// app.use(firewallMiddleware); // <--- TEMPORARILY COMMENTED OUT!
console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
console.warn("!!! FIREWALL MIDDLEWARE (WAF) IS TEMPORARILY DISABLED !!!");
console.warn("!!! REMEMBER TO REVERT THIS AFTER FIXING 404 AND UNBLOCKING IP !!!");
console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");


// === NEW DEBUG LOG: Check if request reaches /api mounting point ===
app.use('/api', (req, res, next) => {
    console.log(`DEBUG-REQUEST-FLOW: Request hit /api mounting point: ${req.method} ${req.originalUrl}`);
    next();
}, apiRoutes); // Mount your main API router after the log


app.use('/auth', authRoutes);

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

// === NEW DEBUG LOG: Catch-all for unhandled routes at the very end ===
app.use((req, res, next) => {
    console.log(`DEBUG-FINAL-FALLBACK: No route matched for ${req.method} ${req.originalUrl}. Sending 404.`);
    next();
});

// ✅ Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

// ✅ Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    // console.log('🛡️  WAF (Web Application Firewall) is active and monitoring traffic'); // Removed if already
});