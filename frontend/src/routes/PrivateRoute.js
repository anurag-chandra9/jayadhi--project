import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Make sure this path is correct

const PrivateRoute = ({ children, allowedRoles }) => {
    // Get the correct state variables from our AuthContext
    const { user, loading } = useAuth();

    // 1. If the context is still loading, show a loading message.
    // This prevents the redirect from happening before the user is checked.
    if (loading) {
        return <div>Loading...</div>;
    }

    // 2. If not loading and there is no user, redirect to login.
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // 3. If roles are specified, check if the user's role is allowed.
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // User is logged in but doesn't have the required role
        return <Navigate to="/access-denied" replace />;
    }

    // 4. If all checks pass, render the component.
    return children;
};

export default PrivateRoute;
