// server/index-fixed.js - Fixed CORS version
const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const logger = require('./middleware/logger');
const { firewallMiddleware } = require('./middleware/firewallMiddleware');
const cors = require('cors');
const path = require('path');

// Import middleware and routes
const AuthMiddleware = require('./middleware/Auth');
const { authorize } = require('./middleware/rbacMiddleware');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', true);

// CORS Configuration for Production and Development
let allowedOrigins = [];

if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin =>
    origin.trim().replace(/\/+$/, '')
  );
} else if (process.env.NODE_ENV === 'production') {
  // Production - Render automatically sets RENDER_EXTERNAL_URL
  const renderUrl = process.env.RENDER_EXTERNAL_URL;
  allowedOrigins = renderUrl ? [renderUrl] : ['https://jayadhi-project-1-fafl.onrender.com'];
  
  // Always include your specific Render URL
  if (!allowedOrigins.includes('https://jayadhi-project-1-fafl.onrender.com')) {
    allowedOrigins.push('https://jayadhi-project-1-fafl.onrender.com');
  }
} else {
  // Development fallback
  allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://client1.local:3001',
    'http://client2.local:3002',
    'http://admin3.local:3003'
  ];
}

app.use(cors({
  origin: function (origin, callback) {
    console.log('🌐 Incoming origin:', origin);
    console.log('✅ Allowed origins:', allowedOrigins);

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Normalize origin by removing trailing slash for comparison
    const normalizedOrigin = origin.replace(/\/+$/, '');
    
    // Check both original origin and normalized origin
    if (allowedOrigins.includes(origin) || allowedOrigins.includes(normalizedOrigin)) {
      console.log('✅ CORS: Origin allowed');
      callback(null, true);
    } else {
      console.error('⛔ Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Middlewares
app.use(logger);

// Conditionally use firewall in production
if (process.env.NODE_ENV === 'production') {
  app.use(firewallMiddleware);
}

// Conditional JSON parsing - only for non-multipart
app.use((req, res, next) => {
  const contentType = req.headers['content-type'];

  if (contentType && contentType.includes('multipart/form-data')) {
    console.log('🔧 Skipping JSON parsing for multipart request');
    return next();
  }

  express.json({ limit: '10mb' })(req, res, next);
});

// Health check endpoint for Render
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api', (req, res, next) => {
    console.log(`DEBUG-REQUEST-FLOW: Request hit /api mounting point: ${req.method} ${req.originalUrl}`);
    next();
}, apiRoutes);

app.use('/auth', authRoutes);

app.use('/admin',
    AuthMiddleware,
    authorize(['admin']),
);

// Serve static files (reports)
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// Root route - Automatic redirect to /home
app.get('/', (req, res) => {
  console.log('🏠 Root route accessed, redirecting to /home');
  res.redirect(301, '/home');
});

// Serve React frontend build files for other static assets
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Catch all handler for React Router routes (excluding API routes)
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/admin') || req.path.startsWith('/reports')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  const indexPath = path.join(__dirname, '../frontend/build/index.html');
  
  // Check if build file exists
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ 
      error: 'Frontend build not found', 
      message: 'Please run npm run build first' 
    });
  }
});

// Global Error Handler
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

// Start server with error handling
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS Origins: ${allowedOrigins.join(', ')}`);
  if (process.env.NODE_ENV === 'production') {
    console.log('🛡️  WAF (Web Application Firewall) is active');
  }
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});