const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const logger = require('./middleware/logger');
const { firewallMiddleware } = require('./middleware/firewallMiddleware');
const cors = require('cors');

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', true);

// Middleware (ORDER IS IMPORTANT!)
const allowedOrigins = [
  'http://localhost:3001',
  'http://client1.local:3001',
  'http://client2.local:3002',
  'http://admin3.local:3003',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' })); // Add request size limit
app.use(logger);
app.use(firewallMiddleware); // WAF should be early in the middleware chain
// Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to Cybersecurity Platform API - Protected by WAF');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('WAF (Web Application Firewall) is active and monitoring traffic');
});