const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const admin = require('firebase-admin');
const User = require('../models/userModel');
const AuthTracker = require('../middleware/authTracker');
const { WAFCore, WAFLogger } = require('../middleware/firewallMiddleware');
const { setAdminSession } = require('../middleware/wafAlerts');
const jwt = require('jsonwebtoken'); // 1. IMPORT JWT

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = require('../config/serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// 2. HELPER FUNCTION TO GENERATE YOUR APP's TOKEN
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};


// ... (Your signup and other routes remain the same) ...
router.post('/signup', async (req, res) => {
    // ... existing signup code
});

router.post('/login', async (req, res) => {
    // ... existing custom token login code
});

router.post('/verify-token', async (req, res) => {
    // ... existing verify-token code
});


// --- THIS IS THE FIX ---
// Firebase ID Token Login
router.post('/firebase-login', async (req, res) => {
  try {
    const { idToken } = req.body;
    const ipAddress = AuthTracker.getClientIP(req);

    if (!idToken) {
      return res.status(400).json({ message: 'Firebase ID token is required' });
    }

    const isBlocked = await AuthTracker.isClientBlocked(req);
    if (isBlocked) {
      return res.status(403).json({
        message: 'Access denied. Your access has been blocked due to suspicious activity.'
      });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      return res.status(404).json({ message: 'User not found in database' });
    }

    await AuthTracker.recordSuccessfulLogin(req, user.email);
    user.lastLogin = new Date();
    await user.save();

    WAFLogger.info('Firebase token login successful', {
      email: user.email,
      ipAddress,
      firebaseUid: user.firebaseUid
    });

    // 3. GENERATE AND SEND BACK YOUR APP's JWT
    const appToken = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'Firebase login successful',
      token: appToken, // <-- THE MISSING PIECE FOR THE FRONTEND
      user: {
        username: user.username,
        email: user.email,
        role: user.role, // Also good to send the role back directly
      }
    });
  } catch (error) {
    WAFLogger.error('Firebase login error', {
      error: error.message,
      ipAddress: AuthTracker.getClientIP(req)
    });

    if (error.code && error.code.startsWith('auth/')) {
      return res.status(401).json({ message: 'Invalid Firebase token' });
    }

    res.status(500).json({ message: 'Server error during Firebase login' });
  }
});

router.post('/logout', async (req, res) => {
    // ... existing logout code
});

module.exports = router;
