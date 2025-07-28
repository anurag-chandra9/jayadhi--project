const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const admin = require('firebase-admin'); // Already imported
const User = require('../models/userModel');
const AuthTracker = require('../middleware/authTracker');
const { WAFCore, WAFLogger } = require('../middleware/firewallMiddleware');
const { setAdminSession } = require('../middleware/wafAlerts');

// Firebase Admin SDK is initialized in Auth.js middleware - no need to initialize here

// === NEW: Initialize Firestore from Admin SDK ===
const db = admin.firestore();

// Signup
router.post('/signup', async (req, res) => {
    console.log('Signup request body:', req.body);
    try {
        const { username, email, password } = req.body;
        const ipAddress = AuthTracker.getClientIP(req);

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email, and password are required' });
        }

        // Check if client is blocked (using new method)
        const isBlocked = await AuthTracker.isClientBlocked(req);
        if (isBlocked) {
            return res.status(403).json({
                message: 'Access denied. Your access has been blocked due to suspicious activity.'
            });
        }

        let user = await User.findOne({ email });
        if (user) {
            await AuthTracker.recordFailedLogin(req, email); // Record this as a failed attempt to prevent enumeration
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password for your MongoDB user record
        const hashedPassword = await bcrypt.hash(password, 10);

        try {
            // 1. Create Firebase user (in Firebase Authentication)
            const firebaseUser = await admin.auth().createUser({
                email: email,
                password: password, // <-- Sends PLAINTEXT password to Firebase
                displayName: username
            });

            // 2. Create user in your MongoDB database
            user = new User({
                username,
                email,
                password: hashedPassword,
                firebaseUid: firebaseUser.uid // Store Firebase UID
            });
            await user.save();

            // === NEW STEP: Add user document to Firestore ===
            const userDocRef = db.collection('users').doc(firebaseUser.uid); // Use Firebase UID as doc ID
            await userDocRef.set({
                username: username,
                email: email,
                firebaseUid: firebaseUser.uid,
                createdAt: admin.firestore.FieldValue.serverTimestamp(), // Optional: add timestamp
                role: 'user' // Example: default role, you can expand this
            });


            WAFLogger.info('New user registered', { email, ipAddress, firebaseUid: firebaseUser.uid });
            res.status(201).json({
                message: 'User registered successfully',
                firebaseUid: firebaseUser.uid
            });
        } catch (firebaseError) {
            WAFLogger.error('Firebase user creation or Firestore write failed', { // Updated logging
                error: firebaseError.message,
                email,
                ipAddress
            });

            // Handle specific Firebase errors
            if (firebaseError.code === 'auth/email-already-exists') {
                // IMPORTANT: If Firebase user creation succeeds but Firestore fails,
                // you might have an orphaned Firebase Auth user. Consider adding
                // admin.auth().deleteUser(firebaseUser.uid) here for rollback.
                return res.status(400).json({ message: 'Email already exists in Firebase' });
            }
            if (firebaseError.code === 'auth/weak-password') {
                return res.status(400).json({ message: 'Password is too weak' });
            }
            if (firebaseError.code === 'auth/invalid-email') {
                return res.status(400).json({ message: 'Invalid email format' });
            }

            res.status(500).json({ message: 'Failed to create user account or save to Firestore' }); // Updated message
        }
    } catch (err) {
        WAFLogger.error('Signup error', {
            error: err.message,
            ipAddress: AuthTracker.getClientIP(req)
        });
        res.status(500).json({ message: 'Server error' });
    }
});

// !!! The previous '/login' route has been removed from here as discussed !!!

// Verify Firebase Token (for testing and validation, used by Auth middleware)
router.post('/verify-token', async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ message: 'ID token is required' });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const user = await User.findOne({ firebaseUid: decodedToken.uid });

        if (!user) {
            return res.status(404).json({ message: 'User not found in database' });
        }

        res.json({
            success: true,
            message: 'Token verified successfully',
            user: {
                firebaseUid: decodedToken.uid,
                email: decodedToken.email,
                username: user.username,
                emailVerified: decodedToken.email_verified
            }
        });
    } catch (error) {
        WAFLogger.error('Token verification failed', { error: error.message });

        // Handle specific Firebase token errors
        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({ message: 'Token has expired' });
        }
        if (error.code === 'auth/id-token-revoked') {
            return res.status(401).json({ message: 'Token has been revoked' });
        }
        if (error.code === 'auth/invalid-id-token') {
            return res.status(401).json({ message: 'Invalid token format' });
        }

        res.status(401).json({ message: 'Invalid token' });
    }
});

// Firebase ID Token Login (This is the backend endpoint for login from frontend now)
// Your frontend's loginWithFirebase calls client-side Firebase auth, gets an ID token,
// and then sends that ID token here for backend validation and user data retrieval.
router.post('/firebase-login', async (req, res) => {
    console.log("FIREBASE_LOGIN_DEBUG: /firebase-login route hit."); // NEW LOG
    try {
        const { idToken } = req.body;
        const ipAddress = AuthTracker.getClientIP(req);

        if (!idToken) {
            console.log("FIREBASE_LOGIN_DEBUG: ID token is missing."); // NEW LOG
            return res.status(400).json({ message: 'Firebase ID token is required' });
        }

        // Check if client is blocked
        console.log("FIREBASE_LOGIN_DEBUG: Checking if client is blocked."); // NEW LOG
        const isBlocked = await AuthTracker.isClientBlocked(req);
        if (isBlocked) {
            console.log("FIREBASE_LOGIN_DEBUG: Client is blocked."); // NEW LOG
            return res.status(403).json({
                message: 'Access denied. Your access has been blocked due to suspicious activity.'
            });
        }

        // Verify the Firebase ID token
        console.log("FIREBASE_LOGIN_DEBUG: Attempting to verify Firebase ID token."); // NEW LOG
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log("FIREBASE_LOGIN_DEBUG: ID token verified. UID:", decodedToken.uid); // NEW LOG

        console.log("FIREBASE_LOGIN_DEBUG: Attempting to find user in MongoDB with firebaseUid:", decodedToken.uid); // NEW LOG
        const user = await User.findOne({ firebaseUid: decodedToken.uid });
        console.log("FIREBASE_LOGIN_DEBUG: MongoDB user find result:", user ? user.email : 'Not Found'); // NEW LOG

        if (!user) {
            console.log("FIREBASE_LOGIN_DEBUG: User not found in MongoDB."); // NEW LOG
            return res.status(404).json({ message: 'User not found in database' });
        }

        // --- CRITICAL FIX FOR EXISTING USERS' ROLE CASE ---
        // Ensure the role is lowercase before saving, to match the updated enum
        if (user.role && typeof user.role === 'string') {
            user.role = user.role.toLowerCase();
            console.log("FIREBASE_LOGIN_DEBUG: Converted user role to lowercase:", user.role); // NEW LOG
        }

        // Record successful login
        console.log("FIREBASE_LOGIN_DEBUG: Recording successful login."); // NEW LOG
        await AuthTracker.recordSuccessfulLogin(req, user.email);

        // Update user's last login
        console.log("FIREBASE_LOGIN_DEBUG: Updating user's last login."); // NEW LOG
        user.lastLogin = new Date();
        await user.save(); // This save should now work without enum validation error

        WAFLogger.info('Firebase token login successful', {
            email: user.email,
            ipAddress,
            firebaseUid: user.firebaseUid
        });

        console.log("FIREBASE_LOGIN_DEBUG: Sending success response."); // NEW LOG
        res.json({
            success: true,
            message: 'Firebase login successful',
            user: {
                username: user.username,
                email: user.email,
                firebaseUid: user.firebaseUid,
                emailVerified: decodedToken.email_verified
            }
        });
    } catch (error) {
        console.error('FIREBASE_LOGIN_ERROR: Error during Firebase login backend process:', error); // NEW LOG

        if (error.code && error.code.startsWith('auth/')) {
            return res.status(401).json({ message: 'Invalid Firebase token' });
        }
        // This is the generic 500 error that was being returned
        res.status(500).json({ message: 'Server error during Firebase login' });
    }
});

// Logout
router.post('/logout', async (req, res) => {
    try {
        const ipAddress = AuthTracker.getClientIP(req);
        const { firebaseUid } = req.body;

        // Optional: Revoke Firebase tokens for enhanced security
        if (firebaseUid) {
            try {
                await admin.auth().revokeRefreshTokens(firebaseUid);
                WAFLogger.info('Firebase tokens revoked for user', { firebaseUid, ipAddress });
            } catch (revokeError) {
                WAFLogger.warn('Failed to revoke Firebase tokens', {
                    firebaseUid,
                    error: revokeError.message
                });
            }
        }

        WAFLogger.info('User logout', { ipAddress, firebaseUid });
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        WAFLogger.error('Logout error', { error: error.message });
        res.status(500).json({ message: 'Server error during logout' });
    }
});

module.exports = router;