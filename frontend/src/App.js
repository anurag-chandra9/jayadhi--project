import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './components/Login';
import Signup from './components/Signup';
import AssetManagement from './components/AssetManagement';
import RiskDashboard from './components/RiskDashboard';
import ReportIncident from './components/ReportIncident';
import  Home  from './components/Home';
import ChatbotInterface from './components/Chat/ChatbotInterface';

function App() {
  // ✅ Simple authentication check
  const isLoggedIn = !!localStorage.getItem('token');

  return (
    <Router>
      <Routes>
        {/* Shared layout (e.g., Navbar) */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="home" element={<Home />} />
          <Route path="assets" element={<AssetManagement />} />
          <Route path="risk-dashboard" element={<RiskDashboard />} />
          <Route path="report-incident" element={<ReportIncident />} />

          {/* ✅ Only accessible if user is logged in */}
          {isLoggedIn && (
            <Route path="chatbot" element={<ChatbotInterface />} />
          )}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
