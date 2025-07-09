import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './components/Login';
import Signup from './components/Signup';
import AssetManagement from './components/AssetManagement';
import RiskDashboard from './components/RiskDashboard';
import ReportIncident from './components/ReportIncident';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="home" element={<h2 style={{ padding: "2rem" }}>🏠 Welcome Home!</h2>} />
          <Route path="assets" element={<AssetManagement />} />
          <Route path="risk-dashboard" element={<RiskDashboard />} />
          <Route path="report-incident" element={<ReportIncident />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
