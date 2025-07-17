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
import HomePage from './components/Home'; // ✅ Correct path to your file

import SubscriptionForm from './components/SubscriptionForm';
import PrivateRoute from "./routes/PrivateRoute";
import { useAuth } from './context/AuthContext';

function App() {
  const { isLoggedIn } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route
            path="home"
            element={
              
                <HomePage />
              
            }
          />
          <Route
            path="assets"
            element={
              <PrivateRoute>
                <AssetManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="risk-dashboard"
            element={
              <PrivateRoute>
                <RiskDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="report-incident"
            element={
              <PrivateRoute>
                <ReportIncident />
              </PrivateRoute>
            }
          />
          <Route
            path="subscription"
            element={
              <PrivateRoute>
                <SubscriptionForm />
              </PrivateRoute>
            }
          />
          <Route
            path="chatbot"
            element={
              <PrivateRoute>
                <ChatbotInterface />
              </PrivateRoute>
            }
          />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
