// server/middleware/Auth.js
const admin = require("firebase-admin");
const User = require("../models/userModel");

// Initialize Firebase Admin SDK (check if already initialized)
if (!admin.apps.length) {
    const serviceAccount = require("../config/serviceAccountKey.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const verifyToken = async (req, res, next) => {
    console.log("AUTH_MIDDLEWARE_DEBUG: verifyToken started."); // NEW LOG
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.log("AUTH_MIDDLEWARE_DEBUG: No token provided."); // NEW LOG
            return res.status(401).json({
                error: "No token provided",
                message: "Authorization header with Bearer token is required"
            });
        }

        const idToken = authHeader.split("Bearer ")[1];

        if (!idToken) {
            console.log("AUTH_MIDDLEWARE_DEBUG: Token is empty after split."); // NEW LOG
            return res.status(401).json({
                error: "Invalid token format",
                message: "Token is empty"
            });
        }

        try {
            console.log("AUTH_MIDDLEWARE_DEBUG: Attempting Firebase token verification."); // NEW LOG
            // DEBUG: Token string received by backend (first 50 chars): ... (Keep your existing debug logs here)
            // DEBUG: Full token length: ...
            // DEBUG: Type of received token: ...

            const decodedToken = await admin.auth().verifyIdToken(idToken);
            console.log("AUTH_MIDDLEWARE_DEBUG: Firebase token verified successfully. UID:", decodedToken.uid); // NEW LOG

            const roleFromClaims = decodedToken.role || 'user';
            console.log("AUTH_MIDDLEWARE_DEBUG: Role from claims:", roleFromClaims); // NEW LOG

            console.log("AUTH_MIDDLEWARE_DEBUG: Attempting to find user in MongoDB with firebaseUid:", decodedToken.uid); // NEW LOG
            const user = await User.findOne({ firebaseUid: decodedToken.uid });
            console.log("AUTH_MIDDLEWARE_DEBUG: MongoDB user find result:", user ? user.email : 'Not Found'); // NEW LOG

            if (!user) {
                console.log("AUTH_MIDDLEWARE_DEBUG: User not found in MongoDB."); // NEW LOG
                return res.status(404).json({
                    error: "User not found",
                    message: "User not found in local database. Please complete registration."
                });
            }

            if (user.role !== roleFromClaims) {
                console.log("AUTH_MIDDLEWARE_DEBUG: Role mismatch, updating MongoDB role."); // NEW LOG
                user.role = roleFromClaims;
                await user.save().catch(dbErr => console.error("AUTH_MIDDLEWARE_ERROR: Error updating user role in DB:", dbErr));
            }

            req.user = {
                uid: decodedToken.uid,
                email: decodedToken.email,
                role: roleFromClaims,
                dbUser: user
            };

            console.log("AUTH_MIDDLEWARE_DEBUG: User attached to req.user. Calling next()."); // NEW LOG
            next(); // Proceed to the next middleware or route handler

        } catch (firebaseError) {
            console.error("AUTH_MIDDLEWARE_ERROR: Firebase token verification failed:", firebaseError); // Updated log prefix

            let errorMessage = "Invalid token";
            let statusCode = 401;

            switch (firebaseError.code) {
                case 'auth/id-token-expired':
                    errorMessage = "Token has expired. Please log in again.";
                    break;
                case 'auth/id-token-revoked':
                    errorMessage = "Token has been revoked. Please log in again.";
                    break;
                case 'auth/invalid-id-token':
                    errorMessage = "Invalid token. Please log in again.";
                    break;
                case 'auth/argument-error':
                    errorMessage = "Invalid token format.";
                    break;
                default:
                    errorMessage = "Token verification failed.";
            }

            return res.status(statusCode).json({
                error: errorMessage,
                code: firebaseError.code
            });
        }
    } catch (error) {
        console.error("AUTH_MIDDLEWARE_ERROR: Auth middleware caught unhandled error:", error); // Updated log prefix
        return res.status(500).json({
            error: "Internal server error",
            message: "Authentication service error"
        });
    }
};

module.exports = verifyToken;