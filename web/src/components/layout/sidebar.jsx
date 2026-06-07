import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Monitor, 
  Cpu, 
  BarChart3, 
  Settings, 
  LogOut,
  AlertCircle,
  X,
  Package,
  UserCog
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

/**
 * SIDEBAR COMPONENT
 * Features synchronized navigation, custom branding, and a secure logout confirmation modal.
 * Includes both Optimization Settings (main nav) and Account Settings (below logout).
 * COLOR THEME: Light mode — uses white/slate-50 base to complement the dashboard background.
 * Sidebar is white while the dashboard content area is slate-50, keeping them visually related
 * but distinct through a subtle border and shadow separation.
 */
const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Main navigation items synced with App.jsx routes
  const navItems = [
    { 
      name: 'Dashboard', 
      icon: <LayoutDashboard size={20} />, 
      path: '/dashboard' 
    },
    { 
      name: 'Service Terminal', 
      icon: <Monitor size={20} />, 
      path: '/terminal' 
    },
    { 
      name: 'Machine Hub', 
      icon: <Cpu size={20} />, 
      path: '/machines' 
    },
    { 
      name: 'Inventory', 
      icon: <Package size={20} />, 
      path: '/inventory' 
    },
    { 
      name: 'Financial Forecast', 
      icon: <BarChart3 size={20} />, 
      path: '/forecast' 
    },
    { 
      name: 'Optimization Settings',
      icon: <Settings size={20} />, 
      path: '/settings' 
    },
  ];

  /**
   * HANDLER: Secure Logout
   * Clears session data and redirects the user to the login portal.
   */
  const handleFinalLogout = () => {
    // Clear local authentication data
    localStorage.clear();
    navigate('/login');
  };

  return (
    <>
      {/* Sidebar — light white background with a right border to separate from slate-50 content area */}
      <div className="w-72 h-screen bg-white text-slate-700 flex flex-col fixed left-0 top-0 border-r border-slate-200 z-50 shadow-sm">
        
        {/* Branding Section — Custom LaundryLink Logo Design, unchanged */}
        <div className="px-6 pt-8 pb-4">
          <div className="flex items-center gap-3">
            {/* Logo Icons inline with text */}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-violet-500 rounded-full"></div>
              <div className="w-5 h-2 bg-violet-400 rounded-full"></div>
              <div className="w-3 h-3 border-2 border-emerald-400 rounded-full"></div>
            </div>

            {/* Logo Text */}
            <h2 className="text-xl font-black italic tracking-tighter text-slate-900">
              <span className="text-violet-500">LAUNDRY</span>
              <span className="text-emerald-500">LINK</span>
            </h2>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-grow px-4 mt-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold transition-all duration-200 group ${
                      isActive 
                        ? 'bg-sky-500 text-white shadow-lg shadow-sky-200' 
                        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                  >
                    <span className={`transition-colors duration-200 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                    }`}>
                      {item.icon}
                    </span>
                    <span className="text-sm tracking-wide">
                      {item.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer: Account Settings, Logout, and System Status */}
        <div className="p-6 border-t border-slate-100">

          {/* Account Settings link — placed above logout for easy access */}
          <Link
            to="/account-settings"
            className={`flex items-center gap-4 px-5 py-3.5 w-full font-bold transition-all duration-200 group rounded-2xl mb-1 ${
              location.pathname === '/account-settings'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-200'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            <UserCog size={20} className={`transition-colors duration-200 ${
              location.pathname === '/account-settings' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
            }`} />
            <span className="text-sm tracking-wide">Account Settings</span>
          </Link>

          {/* Logout Button */}
          <button 
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-4 px-5 py-3.5 w-full text-slate-400 hover:text-red-500 font-bold transition-all duration-200 group rounded-2xl hover:bg-red-50"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm tracking-wide">Logout</span>
          </button>
          
          {/* System Health Card — light version to match the new sidebar theme */}
          <div className="mt-4 px-5 py-4 bg-slate-50 rounded-[20px] border border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                System Status
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-bold mt-2 px-1">
              <p>Mode: <span className="text-slate-700 font-black">Optimization Active</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* LOGOUT CONFIRMATION MODAL — unchanged */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl border border-slate-100">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-red-50 text-red-500 rounded-2xl">
                <AlertCircle size={28} />
              </div>
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">
              Confirm Logout
            </h3>
            <p className="text-slate-500 font-medium leading-relaxed mb-8">
              Are you sure you want to end your session?
            </p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleFinalLogout}
                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-red-500/25 active:scale-95"
              >
                Logout Now
              </button>
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all active:scale-95"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
