import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Auth
import { AuthProvider, useAuth } from './context/authcontext';

// Layout and Wrapper Components
import Layout from './components/layout/layout';
import { NotificationProvider } from './context/notificationcontext';

// Page Components
import Login from './pages/login';
import Dashboard from './pages/dashboard';
import ServiceTerminal from './pages/serviceterminal';
import MachineHub from './pages/machinehub';
import InventoryPage from './pages/inventory';
import FinancialForecast from './pages/financialforecast';
import OptimizationSettings from './pages/optimizationsettings';
import Settings from './pages/settings';
import CustomerHub from './pages/customerhub';
import ActivityLogs from './pages/activitylogs';
import RecordSales from './pages/recordsales';

/**
 * ProtectedRoute: gate para sa lahat ng authenticated-only pages.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
          Loading...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 1. Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* 2. Protected/Private Routes */}
          <Route
            element={
              <ProtectedRoute>
                <NotificationProvider>
                  <Layout />
                </NotificationProvider>
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/terminal" element={<ServiceTerminal />} />
            <Route path="/machines" element={<MachineHub />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/forecast" element={<FinancialForecast />} />
            <Route path="/optimization-settings" element={<OptimizationSettings />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/customer-hub" element={<CustomerHub />} />
            <Route path="/activity-logs" element={<ActivityLogs />} />
            <Route path="/record-sales" element={<RecordSales />} />
          </Route>

          {/* 3. Global Fallbacks and Redirects */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;