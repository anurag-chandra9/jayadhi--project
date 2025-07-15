const express = require('express');
const app = express();

// ... existing middleware and configurations ...

// Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// ... existing server start logic ...

module.exports = app;