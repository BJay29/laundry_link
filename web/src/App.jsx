import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Page Imports
import Login from './pages/login';
import Dashboard from './pages/dashboard';
import Forecasting from './pages/forecasting'; 
import AllBookings from './pages/allbookings'; 
import Customers from './pages/customer'; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- Public Routes --- */}
        {/* Primary entry point for unauthenticated users */}
        <Route path="/login" element={<Login />} />
        
        {/* --- Private/Authenticated Routes --- */}
        {/* Main landing page providing a real-time operational overview */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Time-series analysis page; currently in empty state awaiting data analysis */}
        <Route path="/forecasting" element={<Forecasting />} />
        
        {/* Comprehensive list of all transaction and booking histories */}
        <Route path="/all-bookings" element={<AllBookings />} />
        
        {/* Customer segmentation and intelligence tracking using K-Means logic */}
        <Route path="/customers" element={<Customers />} />

        {/* --- Redirects & Navigation Fallbacks --- */}
        {/* Redirect root path to login by default */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Wildcard route: Redirect any undefined paths back to login for security */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;