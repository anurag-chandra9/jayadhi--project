// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Layout from './components/Layout';
import Login from './components/Login';
import Signup from './components/Signup';
import AssetManagement from './components/AssetManagement';
import RiskDashboard from './components/RiskDashboard';
import ReportIncident from './components/ReportIncident';
import ChatbotInterface from './components/Chat/ChatbotInterface';
import HomePage from './components/Home';
import SubscriptionForm from './components/SubscriptionForm';
import PrivateRoute from "./routes/PrivateRoute";
import AdminUserManagement from './components/AdminUserManagement';
import AdminWAFManagement from './components/AdminWAFManagement';
import CompliancePage from './components/CompliancePage'; // <-- IMPORT THE NEW COMPONENT

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
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/access-denied" element={<AccessDenied />} />

          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<HomePage />} />

            {/* Protected Routes */}
            <Route path="assets" element={<PrivateRoute><AssetManagement /></PrivateRoute>} />
            <Route path="risk-dashboard" element={<PrivateRoute><RiskDashboard /></PrivateRoute>} />
            <Route path="report-incident" element={<PrivateRoute><ReportIncident /></PrivateRoute>} />
            <Route path="subscription" element={<PrivateRoute><SubscriptionForm /></PrivateRoute>} />
            <Route path="chatbot" element={<PrivateRoute><ChatbotInterface /></PrivateRoute>} />
            
            {/* --- ROUTE ADDED HERE --- */}
            <Route path="compliance" element={<PrivateRoute><CompliancePage /></PrivateRoute>} />

            {/* Admin Specific Routes */}
            <Route
              path="admin/user-management"
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <AdminUserManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="admin/waf-management"
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <AdminWAFManagement />
                </PrivateRoute>
              }
            />

            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;