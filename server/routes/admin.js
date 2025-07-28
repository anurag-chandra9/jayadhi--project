// server/routes/admin.js
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const User = require('../models/userModel');
const Auth = require('../middleware/Auth');
const { authorize } = require('../middleware/rbacMiddleware');

// Initialize Firebase Admin SDK (check if already initialized)
if (!admin.apps.length) {
    const serviceAccount = require("../config/serviceAccountKey.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

// Get Firestore instance from admin SDK (if not already done globally)
// Assuming 'admin' is initialized, you can get firestore instance like this
// If you have a global db instance (e.g., from connectDB), ensure it's imported or available
const db = admin.firestore(); // Make sure this line is present if you use Firestore here

// === NEW LOG: Check if this router file is being hit at all ===
console.log("DEBUG: server/routes/admin.js router file loaded and accessed.");

// Admin-only route to set a user's role
router.post('/set-user-role', Auth, async (req, res) => { // TEMPORARY CHANGE!
    console.log("Admin route /set-user-role called."); // This is the log we're trying to see
    try {
        const { email, role } = req.body;

        if (!email || !role) {
            return res.status(400).json({ message: 'Email and role are required.' });
        }
        const validRoles = ['user', 'admin']; // Define your valid roles here
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Invalid role specified.' });
        }

        console.log(`Attempting to set role '${role}' for user: ${email}`);

        // 1. Find the user in Firebase Auth by email
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(email);
            console.log("1. Firebase Auth user found:", userRecord.uid);
        } catch (authError) {
            console.error("Error at step 1 (getUserByEmail):", authError);
            if (authError.code === 'auth/user-not-found') {
                return res.status(404).json({ message: 'User not found in Firebase Authentication.' });
            }
            throw authError; // Re-throw to be caught by outer catch
        }
        const uid = userRecord.uid;

        // 2. Set Firebase Custom Claim
        try {
            await admin.auth().setCustomUserClaims(uid, { role: role });
            console.log("2. Firebase Custom Claim set for UID:", uid);
        } catch (claimsError) {
            console.error("Error at step 2 (setCustomUserClaims):", claimsError);
            throw claimsError;
        }

        // 3. Update the user's role in your MongoDB database
        let updatedUser;
        try {
            updatedUser = await User.findOneAndUpdate(
                { firebaseUid: uid },
                { role: role },
                { new: true }
            );
            console.log("3. MongoDB user role updated for UID:", uid);
            if (!updatedUser) {
                console.warn(`MongoDB user with Firebase UID ${uid} not found for update.`);
                return res.status(404).json({ message: 'User found in Firebase Auth, but not in local MongoDB database. Role not updated in DB.' });
            }
        } catch (mongoError) {
            console.error("Error at step 3 (User.findOneAndUpdate):", mongoError);
            throw mongoError;
        }

        // 4. Update the user's role in your Firestore database
        try {
            const userDocRef = db.collection('users').doc(uid);
            await userDocRef.update({ role: role });
            console.log("4. Firestore user role updated for UID:", uid);
        } catch (firestoreError) {
            console.error("Error at step 4 (Firestore update):", firestoreError);
            throw firestoreError;
        }

        // Important: Revoke refresh tokens to force the user to re-authenticate
        try {
            await admin.auth().revokeRefreshTokens(uid);
            console.log("5. Firebase Refresh Tokens revoked for UID:", uid);
        } catch (revokeError) {
            console.error("Error at step 5 (revokeRefreshTokens):", revokeError);
            // This might not be a critical error, but log it.
            // Still proceed to success if other steps are done.
        }

        console.log("All steps completed successfully. Sending response.");
        res.status(200).json({
            message: `User ${email} role updated to ${role} successfully. User will need to log in again to get new permissions.`,
            user: { email: updatedUser.email, role: updatedUser.role }
        });

    } catch (error) {
        console.error('Final Catch: Error setting user role:', error);
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ message: 'User not found in Firebase Authentication.' });
        }
        res.status(500).json({ message: 'Failed to set user role.', error: error.message || 'Unknown error' });
    }
});

module.exports = router;