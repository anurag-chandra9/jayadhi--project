// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

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
import CompliancePage from './components/CompliancePage'; // Assuming this is a valid component


// Removed imports for AdminUserManagement and AdminWAFManagement as those files were deleted.
// Removed AccessDenied component definition as it's no longer used.


function App() {
  return (
    <Router>
      {/* AuthProvider is typically in index.js to wrap the whole app, but keep here if it's your current setup */}
      {/* Assuming AuthProvider is still correctly wrapping App from index.js as per our last fix */}
      {/* If you prefer to have AuthProvider here, ensure index.js only renders <App /> */}

      <Routes>
        {/* Public Routes - accessible by anyone */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        {/* Removed /access-denied route as the AccessDenied component is removed */}

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
          <Route path="compliance" element={<PrivateRoute><CompliancePage /></PrivateRoute>} />

          {/* Removed Admin Specific Routes as these panels are deleted */}
          {/*
          <Route path="admin/user-management" element={
              <PrivateRoute allowedRoles={['admin']}><AdminUserManagement /></PrivateRoute>
          } />
          <Route path="admin/waf-management" element={
              <PrivateRoute allowedRoles={['admin']}><AdminWAFManagement /></PrivateRoute>
          } />
          */}

          {/* Catch-all for undefined routes - redirect to home or a 404 page */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;