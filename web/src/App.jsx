import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layout and Wrapper Components
import Layout from './components/layout/layout';

// Page Components
import Login from './pages/login';
import Dashboard from './pages/dashboard';
import ServiceTerminal from './pages/serviceterminal';
import MachineHub from './pages/machinehub';
import InventoryPage from './pages/inventory';
import FinancialForecast from './pages/financialforecast';
import OptimizationSettings from './pages/optimizationsettings';
import Settings from './pages/settings';       // Account Settings page for profile and password management
import CustomerHub from './pages/customerhub'; // Customer segmentation powered by K-Means AI engine
import ActivityLogs from './pages/activitylogs'; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. Public Routes: Accessible without Sidebar */}
        <Route path="/login" element={<Login />} />

        {/* 2. Protected/Private Routes: All routes inside will render with the Sidebar via Layout */}
        <Route element={<Layout />}>
          
          {/* Default entry point after successful login */}
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Management of daily laundry transactions */}
          <Route path="/terminal" element={<ServiceTerminal />} />
          
          {/* Monitoring and management of laundry machinery */}
          <Route path="/machines" element={<MachineHub />} />

          {/* Inventory management for shop supplies */}
          <Route path="/inventory" element={<InventoryPage />} />
          
          {/* Revenue and booking projections based on historical data */}
          <Route path="/forecast" element={<FinancialForecast />} />
          
          {/* Configuration for pricing, operating costs, and profit optimization */}
          <Route path="/settings" element={<OptimizationSettings />} />

          {/* Account settings for shop profile and password management */}
          <Route path="/account-settings" element={<Settings />} />

          {/* AI-powered K-Means customer behavioral segmentation hub */}
          <Route path="/customer-hub" element={<CustomerHub />} />

        </Route>

        <Route path="/activity-logs" element={<ActivityLogs />} />

        {/* 3. Global Fallbacks and Redirects */}
        {/* Redirect root path to login by default */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Wildcard route to handle 404s or undefined paths by redirecting to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
