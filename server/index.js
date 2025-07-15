const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const logger = require('./middleware/logger');
const { firewallMiddleware } = require('./middleware/firewallMiddleware');
const cors = require('cors');
const path = require('path');

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
    if (!origin) return callback(null, true); // allow REST clients, curl, Postman etc.

    // Normalize origin (remove trailing slash if present)
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

// ✅ Custom middlewares
app.use(logger);
app.use(firewallMiddleware); // WAF should be early

// ✅ Routes
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');

app.use('/api', apiRoutes);
app.use('/auth', authRoutes);

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
