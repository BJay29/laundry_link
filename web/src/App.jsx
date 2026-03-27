import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login';
import Dashboard from './pages/dashboard';
import Forecasting from './pages/forecasting'; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />
        
        {/* Private/Authenticated Routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/forecasting" element={<Forecasting />} />
        
        {/* Temporary Redirects para sa mga wala pang page */}
        <Route path="/all-bookings" element={<Navigate to="/dashboard" replace />} />
        <Route path="/customers" element={<Navigate to="/dashboard" replace />} />

        {/* Default Redirects - DITO KA NARE-REDIRECT KAYA BUMABALIK SA LOGIN */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Kapag hindi nahanap ang path, babalik sa login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;