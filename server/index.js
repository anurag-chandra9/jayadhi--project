// server/index.js

const express = require('express');
console.log("DEBUG-GLOBAL: Express app initialized. Request received."); // Keep this for general startup confirmation

const dotenv = require('dotenv');
const connectDB = require('./config/db');
const logger = require('./middleware/logger');
const { firewallMiddleware } = require('./middleware/firewallMiddleware'); // <-- firewallMiddleware is imported
const cors = require('cors');
const path = require('path');

// === CRITICAL FIX: Keep AuthMiddleware and authorize imports for RBAC ===
const AuthMiddleware = require('./middleware/Auth');
const { authorize } = require('./middleware/rbacMiddleware'); // RBAC is remaining intact, so keep this import.

// Import standard API and Auth routes
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
// Note: adminRoutes import should be removed if admin.js was deleted.


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
app.use(firewallMiddleware); // <-- firewallMiddleware is now ACTIVE (bypass disabled)


// ✅ Mount your standard API routes
// These now contain the authorize middleware directly on their routes
app.use('/api', apiRoutes);

// ✅ Mount your authentication routes
app.use('/auth', authRoutes);

// Removed the app.use('/admin', ...) block here as admin routes are no longer here
// You would also remove 'const adminRoutes = require('./routes/admin');' if admin.js was deleted.


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