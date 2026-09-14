import React from 'react';
import { 
  LayoutDashboard, 
  Monitor, 
  Cpu, 
  BarChart3, 
  Settings, 
  Package, 
  Users, 
  History, 
  Receipt,
  LogOut 
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import laundryLinkLogo from '../../assets/Untitled design.png';

/**
 * SIDEBAR COMPONENT
 * Updated: Replaced "Main Navigation" text with logo image at the top,
 * and restored Account Settings & Logout at the bottom.
 */
const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

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
      name: 'Customer Hub', 
      icon: <Users size={20} />, 
      path: '/customer-hub' 
    },
    { 
      name: 'Record Sales', 
      icon: <Receipt size={20} />, 
      path: '/record-sales' 
    },
    { 
      name: 'Financial Forecast', 
      icon: <BarChart3 size={20} />, 
      path: '/forecast' 
    },
    { 
      name: 'Optimization Settings',
      icon: <Settings size={20} />, 
      path: '/optimization-settings' 
    },
    {
      name: 'Activity Logs',
      icon: <History size={20} />,
      path: '/activity-logs'
    },
  ];

  return (
    <aside className="w-72 h-screen bg-white text-slate-700 flex flex-col fixed left-0 top-0 border-r border-slate-200 z-40 shadow-sm">
      
      {/* 1. Top Section: Logo Image na kapantay ng Header */}
      <div className="h-16 px-6 flex items-center border-b border-slate-100">
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <img src={laundryLinkLogo} alt="LaundryLink Logo" className="h-8 w-8 object-contain" />
          <span className="text-xl font-black italic tracking-tight">
            <span className="text-sky-500"></span>
            <span className="text-green-600"></span>
          </span>
        </Link>
      </div>

      {/* 2. Navigation Links (Scrollable kung kinakailangan) */}
      <nav className="flex-grow px-4 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-4 px-5 py-3 rounded-2xl font-bold transition-all duration-200 group ${
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

      {/* 3. Sidebar Footer: System Status, Account Settings, and Logout */}
      <div className="p-4 border-t border-slate-100 m-4 space-y-3">
        <div className="px-5 py-3 bg-slate-50 rounded-[20px] border border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
              System Status
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-bold mt-1.5 px-1">
            <p>Mode: <span className="text-slate-700 font-black">Optimization Active</span></p>
          </div>
        </div>

        {/* Account Settings & Logout Buttons */}
        <div className="space-y-1 px-1">
          <button 
            onClick={() => navigate('/optimization-settings')}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            <Settings size={16} className="text-slate-400" /> Account Settings
          </button>
          <button 
            onClick={() => navigate('/login')}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
          >
            <LogOut size={16} className="text-rose-500" /> Logout
          </button>
        </div>
      </div>

    </aside>
  );
};

export default Sidebar;