import React from 'react';
import { 
  LayoutDashboard, 
  Monitor, 
  Cpu, 
  BarChart3, 
  Settings, 
  LogOut 
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();

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

  return (
    <div className="w-72 h-screen bg-[#1a2233] text-white flex flex-col fixed left-0 top-0 shadow-2xl border-r border-slate-800/50 z-50">
      {/* Branding Section */}
      <div className="p-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-sky-500 p-2 rounded-xl shadow-lg shadow-sky-500/20">
            {/* Spinning Loader Icon for Branding */}
            <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-[spin_3s_linear_infinite]"></div>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            LaundryLink<span className="text-sky-500 text-3xl">.</span>
          </h2>
        </div>
        <p className="text-[10px] text-sky-400 font-bold uppercase tracking-[0.2em] mt-2 px-1">
          
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-grow px-4 mt-6">
        <ul className="space-y-3">
          {navItems.map((item) => {
            // Highlighting logic for the active route
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

      {/* Sidebar Footer: System Status and Logout */}
      <div className="p-6 border-t border-slate-800/50">
        <Link 
          to="/login"
          className="flex items-center gap-4 px-5 py-4 w-full text-slate-400 hover:text-red-400 font-bold transition-all duration-200 group rounded-2xl hover:bg-red-500/5"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm tracking-wide">Logout</span>
        </Link>
        
        {/* System Health Card */}
        <div className="mt-6 px-5 py-5 bg-[#242d40] rounded-[24px] border border-slate-700/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
              System Status
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-bold leading-relaxed px-1">
            Mode: <span className="text-slate-300 font-black">Optimization Active</span> <br />
            Sync: <span className="text-slate-400 italic">Just now</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;