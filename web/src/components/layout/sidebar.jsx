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
  Package // Added Package icon for Inventory
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

/**
 * SIDEBAR COMPONENT
 * Features synchronized navigation, custom branding, and a secure logout confirmation modal.
 */
const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Navigation items fully synced with App.jsx routes
  const navItems = [
    { 
      name: 'Overview Dashboard', 
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
      name: 'Inventory', // Added Inventory navigation item
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
   * Clears session logic and redirects the user to the login portal.
   */
  const handleFinalLogout = () => {
    // Clear local authentication data here if needed (e.g., localStorage.clear())
    navigate('/login');
  };

  return (
    <>
      <div className="w-72 h-screen bg-[#1a2233] text-white flex flex-col fixed left-0 top-0 shadow-2xl border-r border-slate-800/50 z-50">
        
        {/* Branding Section - Custom LaundryLink Logo Design */}
        <div className="p-8">
          <div className="flex flex-col gap-1">
            {/* Logo Icon Style */}
            <div className="flex items-center gap-2 mb-2 ml-1">
               <div className="w-3.5 h-3.5 bg-violet-600 rounded-full shadow-lg shadow-violet-600/20"></div>
               <div className="w-6 h-2 bg-violet-500 rounded-full"></div>
               <div className="w-3.5 h-3.5 border-2 border-emerald-500 rounded-full"></div>
            </div>

            {/* Logo Text: Bold and Italicized */}
            <h2 className="text-2xl font-black italic tracking-tighter text-white">
              <span className="text-violet-500">LAUNDRY</span>
              <span className="text-emerald-500">LINK</span>
            </h2>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-grow px-4 mt-2">
          <ul className="space-y-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all duration-300 group ${
                      isActive 
                        ? 'bg-sky-500 text-white shadow-xl shadow-sky-500/40 translate-x-1' 
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    <span className={`transition-colors duration-300 ${
                      isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
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

        {/* Sidebar Footer: System Status and Logout Trigger */}
        <div className="p-6 border-t border-slate-800/50">
          <button 
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-4 px-5 py-4 w-full text-slate-400 hover:text-red-400 font-bold transition-all duration-200 group rounded-2xl hover:bg-red-500/5"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm tracking-wide">Logout</span>
          </button>
          
          {/* System Health Card */}
          <div className="mt-6 px-5 py-5 bg-[#242d40] rounded-[24px] border border-slate-700/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                System Status
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-bold leading-relaxed px-1">
              <p>Mode: <span className="text-slate-300 font-black">Optimization Active</span></p>
              <p>Sync: <span className="text-slate-400 italic">Just now</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl scale-in-center border border-slate-100">
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