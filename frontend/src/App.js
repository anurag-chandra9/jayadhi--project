// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'; // Ensure Link is imported
import { AuthProvider } from './context/AuthContext'; // AuthProvider wraps the whole app

import Layout from './components/Layout';
import Login from './components/Login';
import Signup from './components/Signup';
import AssetManagement from './components/AssetManagement';
import RiskDashboard from './components/RiskDashboard';
import ReportIncident from './components/ReportIncident';
import ChatbotInterface from './components/Chat/ChatbotInterface';
import HomePage from './components/Home';

import SubscriptionForm from './components/SubscriptionForm';
import PrivateRoute from "./routes/PrivateRoute"; // Your existing PrivateRoute
import AdminUserManagement from './components/AdminUserManagement'; // NEW: Import AdminUserManagement
import AdminWAFManagement from './components/AdminWAFManagement'; // NEW: Import AdminWAFManagement


// NEW: Access Denied Component (you can move this to a separate file later if desired)
const AccessDenied = () => (
  <div style={{ textAlign: 'center', marginTop: '100px' }}>
    <h1>403 - Access Denied</h1>
    <p>You do not have the necessary permissions to view this page.</p>
    <Link to="/home">Go to Home</Link>
  </div>
);


function App() {
  return (
    <Router>
      <AuthProvider> {/* AuthProvider must wrap the Router or Routes */}
        <Routes>
          {/* Public Routes - accessible by anyone */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/access-denied" element={<AccessDenied />} /> {/* NEW: Access Denied Page */}

          {/* Routes wrapped by Layout (common header/footer) */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/home" replace />} /> {/* Redirect / to /home */}
            <Route path="home" element={<HomePage />} /> {/* Home page can be public or private based on your design */}

            {/* Protected Routes - require login (using your PrivateRoute) */}
            <Route path="assets" element={<PrivateRoute><AssetManagement /></PrivateRoute>} />
            <Route path="risk-dashboard" element={<PrivateRoute><RiskDashboard /></PrivateRoute>} />
            <Route path="report-incident" element={<PrivateRoute><ReportIncident /></PrivateRoute>} />
            <Route path="subscription" element={<PrivateRoute><SubscriptionForm /></PrivateRoute>} />
            <Route path="chatbot" element={<PrivateRoute><ChatbotInterface /></PrivateRoute>} />

            {/* NEW: Admin Specific Routes - require 'admin' role */}
            <Route
              path="admin/user-management"
              element={
                <PrivateRoute allowedRoles={['admin']}> {/* Use PrivateRoute with allowedRoles */}
                  <AdminUserManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="admin/waf-management"
              element={
                <PrivateRoute allowedRoles={['admin']}> {/* Use PrivateRoute with allowedRoles */}
                  <AdminWAFManagement />
                </PrivateRoute>
              }
            />

            {/* Catch-all for undefined routes - redirect to home or a 404 page */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;