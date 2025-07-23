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
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        error: "No token provided", 
        message: "Authorization header with Bearer token is required" 
      });
    }

    const idToken = authHeader.split("Bearer ")[1];

    if (!idToken) {
      return res.status(401).json({ 
        error: "Invalid token format", 
        message: "Token is empty" 
      });
    }

    try {
      // Verify the Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Get user from our database to get their role and other details
      const user = await User.findOne({ firebaseUid: decodedToken.uid });
      
      if (!user) {
        return res.status(404).json({ 
          error: "User not found", 
          message: "User not found in local database. Please complete registration." 
        });
      }

      // --- KEY CHANGE FOR RBAC ---
      // Attach user info, INCLUDING THE ROLE, to the request object
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: user.role, // <-- This is the crucial addition
        dbUser: user     // Keep the full user object for flexibility
      };

      next();
    } catch (firebaseError) {
      console.error("Firebase token verification failed:", firebaseError);
      
      let errorMessage = "Invalid token";
      let statusCode = 401;
      
      switch (firebaseError.code) {
        case 'auth/id-token-expired':
          errorMessage = "Token has expired";
          break;
        // ... other error cases remain the same
        default:
          errorMessage = "Token verification failed";
      }
      
      return res.status(statusCode).json({ 
        error: errorMessage,
        code: firebaseError.code 
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: "Authentication service error" 
    });
  }
};

module.exports = verifyToken;