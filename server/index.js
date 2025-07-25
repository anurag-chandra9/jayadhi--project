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

app.set('trust proxy', true);

// ✅ CORS Configuration
let allowedOrigins = [];

if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin =>
    origin.trim().replace(/\/+$/, '')
  );
} else {
  // Fallback for development
  allowedOrigins = ['http://localhost:3001',
    'http://localhost:3000'
  ];
}

app.use(cors({
  origin: function (origin, callback) {
    console.log('🌐 Incoming origin:', origin);
    console.log('✅ Allowed origins:', allowedOrigins);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error('⛔ Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// 🚨 Early middlewares
app.use(logger);
app.use(firewallMiddleware);

// 📦 Conditional JSON parsing - only for non-multipart
app.use((req, res, next) => {
  const contentType = req.headers['content-type'];

  if (contentType && contentType.includes('multipart/form-data')) {
    console.log('🔧 Skipping JSON parsing for multipart request');
    return next();
  }

  express.json({ limit: '10mb' })(req, res, next);
});

// 🛣 Routes
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
app.use('/api', apiRoutes);
app.use('/auth', authRoutes);

// 📂 Static file serving
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// 🔗 Root route
app.get('/', (req, res) => {
  res.send('Welcome to Cybersecurity Platform API - Protected by WAF');
});

// 🧯 Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large',
      message: 'File size exceeds the maximum allowed limit'
    });
  }

  if (err.type === 'entity.parse.failed' && err.body && err.body.includes('WebKitFormBoundary')) {
    return res.status(400).json({
      error: 'Invalid request format',
      message: 'Multipart form data detected but not processed correctly'
    });
  }

  if (err.message && err.message.includes('Unexpected field')) {
    return res.status(400).json({
      error: 'Invalid file field',
      message: 'File upload field name is incorrect or not expected'
    });
  }

  res.status(500).json({ error: 'Internal server error' });
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('WAF (Web Application Firewall) is active and monitoring traffic');
});
