import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Auth
import { AuthProvider, useAuth } from './context/authcontext';

// Layout and Wrapper Components
import Layout from './components/layout/layout';
import LoadingScreen from './components/ui/loadingscreen';
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
import Reviews from './pages/reviews';

/**
 * Mga role na pinapayagang mag-verify ng online payments (Payment
 * Verification ay nasa loob ng Service Terminal, kaya dito nilalagay
 * ang guard). Walang hiwalay na "payment_verifier" role.
 */
const PAYMENT_VERIFIER_ROLES = ['staff', 'manager', 'owner'];

/**
 * ProtectedRoute: gate para sa lahat ng authenticated-only pages.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * RoleRoute: RBAC guard na nakapatong sa ProtectedRoute. Ang role ay
 * galing sa cached profile (localStorage 'role', itinakda ng
 * cacheProfile() sa APIservices.js pagka-login).
 *
 * NOTE: UX guard lang ito — ang totoong proteksyon ay nasa backend
 * (get_current_user + shop_id scoping). Mababasa/mababago ng sinuman
 * ang localStorage sa browser nila.
 */
function RoleRoute({ allowedRoles, children }) {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Loading..." />;
  }

  const role = (localStorage.getItem('role') || '').toLowerCase();
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
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
            <Route
              path="/terminal"
              element={
                <RoleRoute allowedRoles={PAYMENT_VERIFIER_ROLES}>
                  <ServiceTerminal />
                </RoleRoute>
              }
            />
            <Route path="/machines" element={<MachineHub />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/forecast" element={<FinancialForecast />} />
            <Route path="/optimization-settings" element={<OptimizationSettings />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/customer-hub" element={<CustomerHub />} />
            <Route path="/activity-logs" element={<ActivityLogs />} />
            <Route path="/record-sales" element={<RecordSales />} />
            {/* NEW (Rating after order) — mga rating at komento ng customers */}
            <Route path="/reviews" element={<Reviews />} />
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
