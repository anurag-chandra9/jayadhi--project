// frontend/src/routes/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth to get auth state

// This PrivateRoute component now accepts an optional 'allowedRoles' prop.
// If 'allowedRoles' is provided, it will check if the logged-in user's role
// is included in the allowed roles.
const PrivateRoute = ({ children, allowedRoles }) => { // <--- NEW: added allowedRoles prop
    const { isLoggedIn, userClaims, loading } = useAuth(); // Get isLoggedIn, userClaims, and loading

    console.log("PrivateRoute: isLoggedIn =", isLoggedIn, "loading =", loading, "userClaims =", userClaims, "allowedRoles =", allowedRoles); // NEW LOG

    // If authentication state is still loading, show a loading indicator
    if (loading) {
        return <div>Loading authentication...</div>; // Or a more sophisticated loading spinner
    }

    // If not logged in, redirect to the login page
    if (!isLoggedIn) {
        console.log("PrivateRoute: Not logged in, redirecting to /login"); // NEW LOG
        return <Navigate to="/login" replace />;
    }

    // If allowedRoles are specified, check the user's role from claims
    if (allowedRoles && userClaims) { // Only proceed if roles are expected and claims are available
        const userRole = userClaims.role || 'user'; // Get the user's role, default to 'user'
        console.log("PrivateRoute: Checking role. User role:", userRole, "Allowed roles:", allowedRoles); // NEW LOG
        if (!allowedRoles.includes(userRole)) {
            // If the user's role is not in the allowedRoles, redirect to an access denied page
            console.log("PrivateRoute: Role not allowed, redirecting to /access-denied"); // NEW LOG
            return <Navigate to="/access-denied" replace />;
        }
    }

    // If logged in and role is allowed (or no specific roles required), render the children
    console.log("PrivateRoute: Access granted."); // NEW LOG
    return children;
};

export default PrivateRoute;