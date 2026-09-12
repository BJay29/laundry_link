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
 * NEW — ProtectedRoute: gate para sa lahat ng authenticated-only pages.
 *
 * FIXED: dati, WALANG kahit anong session/token check sa App.jsx —
 * kahit sinong hindi naka-login ay puwedeng direktang mag-navigate
 * papuntang /dashboard (o kahit anong ibang protected path) sa pamamagitan
 * lang ng pag-type ng URL, dahil walang humahadlang dito. Ngayon,
 * gamit ang useAuth() (mula sa Supabase session state via AuthContext),
 * kino-check muna kung may valid na session bago i-render ang
 * requested na page — kung wala, agad na i-redirect papuntang /login.
 *
 * Habang kinukuha pa ang unang session check (loading === true),
 * nagpapakita muna ng simpleng loading state sa halip na agad mag-
 * redirect — iniiwasan nito ang "flash ng /login page" habang
 * hinihintay lang talaga ang unang supabase.auth.getSession() resolve.
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
          {/* 1. Public Routes: Accessible without Sidebar */}
          <Route path="/login" element={<Login />} />

          {/* 2. Protected/Private Routes: kailangan na ngayon ng valid
              na Supabase session (see ProtectedRoute sa itaas) bago
              ma-access ang kahit alin sa mga nested routes dito */}
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
            <Route path="/settings" element={<OptimizationSettings />} />
            <Route path="/account-settings" element={<Settings />} />
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