// server/index-simple.js - Simplified server for debugging
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

console.log('🚀 Starting simplified server...');

// Basic CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003'
  ],
  credentials: true
}));

// Basic middleware
app.use(express.json({ limit: '10mb' }));

// Basic logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic API route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running successfully!' });
});

// Serve static files if build exists
const buildPath = path.join(__dirname, '../frontend/build');
try {
  app.use(express.static(buildPath));
  console.log('✅ Serving static files from:', buildPath);
} catch (error) {
  console.log('⚠️  Frontend build not found, skipping static file serving');
}

// Catch all handler
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../frontend/build/index.html');
  
  try {
    res.sendFile(indexPath);
  } catch (error) {
    res.status(404).json({ 
      error: 'Frontend build not found', 
      message: 'Please run npm run build first' 
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simplified server running on http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
});