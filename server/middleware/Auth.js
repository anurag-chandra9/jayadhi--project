// server/middleware/Auth.js
const admin = require("firebase-admin");
const User = require("../models/userModel");

// Initialize Firebase Admin SDK (check if already initialized)
if (!admin.apps.length) {
    try {
        // Debug: Log environment variables (without sensitive data)
        console.log('🔍 Firebase Environment Check:');
        console.log('- NODE_ENV:', process.env.NODE_ENV);
        console.log('- FIREBASE_PROJECT_ID exists:', !!process.env.FIREBASE_PROJECT_ID);
        console.log('- FIREBASE_CLIENT_EMAIL exists:', !!process.env.FIREBASE_CLIENT_EMAIL);
        console.log('- FIREBASE_PRIVATE_KEY exists:', !!process.env.FIREBASE_PRIVATE_KEY);

        // Check if all required Firebase environment variables exist
        const hasFirebaseEnvVars = process.env.FIREBASE_PROJECT_ID && 
                                  process.env.FIREBASE_CLIENT_EMAIL && 
                                  process.env.FIREBASE_PRIVATE_KEY;

        if (hasFirebaseEnvVars) {
            console.log('🔥 Initializing Firebase with environment variables');
            
            // Clean and format the private key
            let privateKey = process.env.FIREBASE_PRIVATE_KEY;
            
            // Remove quotes if they exist
            if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
                privateKey = privateKey.slice(1, -1);
            }
            
            // Replace \\n with actual newlines
            privateKey = privateKey.replace(/\\n/g, '\n');
            
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
            });
            
            console.log('✅ Firebase initialized successfully with environment variables');
        } else {
            // Fallback to service account file (for local development)
            console.log('🔥 Initializing Firebase with service account file');
            const serviceAccount = require("../config/serviceAccountKey.json");
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log('✅ Firebase initialized successfully with service account file');
        }
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error.message);
        console.error('❌ Error details:', error);
        
        // Try application default credentials as last resort
        try {
            console.log('🔄 Attempting Firebase initialization with application default credentials');
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
            });
            console.log('✅ Firebase initialized with application default credentials');
        } catch (fallbackError) {
            console.error('❌ All Firebase initialization methods failed:', fallbackError.message);
            throw new Error('Firebase initialization completely failed');
        }
    }
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
            let user = await User.findOne({ firebaseUid: decodedToken.uid });
            console.log("AUTH_MIDDLEWARE_DEBUG: MongoDB user find result:", user ? user.email : 'Not Found'); // NEW LOG

            if (!user) {
                console.log("AUTH_MIDDLEWARE_DEBUG: User not found in MongoDB. Auto-creating user..."); // NEW LOG
                
                // Auto-create user in MongoDB if they exist in Firebase but not in our database
                try {
                    user = new User({
                        username: decodedToken.name || decodedToken.email?.split('@')[0] || 'user',
                        email: decodedToken.email,
                        firebaseUid: decodedToken.uid,
                        role: roleFromClaims,
                        createdAt: new Date(),
                        lastLogin: new Date()
                    });
                    await user.save();
                    console.log("AUTH_MIDDLEWARE_DEBUG: User auto-created in MongoDB:", user.email); // NEW LOG
                } catch (createError) {
                    console.error("AUTH_MIDDLEWARE_ERROR: Failed to auto-create user:", createError); // NEW LOG
                    return res.status(500).json({
                        error: "User creation failed",
                        message: "Failed to create user record. Please contact support."
                    });
                }
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