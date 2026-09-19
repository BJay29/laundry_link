import React, { useState } from 'react';
import { 
  LayoutDashboard, Monitor, Cpu, BarChart3, Settings, 
  Package, Users, History, Receipt, LogOut, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import laundryLinkLogo from '../../assets/Untitled design.png';

/**
 * SIDEBAR COMPONENT (Collapsible & Dark Theme)
 * 
 * Pwedeng i-toggle para maging icon-only mode o full-width sidebar.
 * Modern dark slate theme para sa mas pormang enterprise look.
 */
const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
    { name: 'Service Terminal', icon: <Monitor size={20} />, path: '/terminal' },
    { name: 'Machine Hub', icon: <Cpu size={20} />, path: '/machines' },
    { name: 'Inventory', icon: <Package size={20} />, path: '/inventory' },
    { name: 'Customer Hub', icon: <Users size={20} />, path: '/customer-hub' },
    { name: 'Record Sales', icon: <Receipt size={20} />, path: '/record-sales' },
    { name: 'Financial Forecast', icon: <BarChart3 size={20} />, path: '/forecast' },
    { name: 'Optimization Settings', icon: <Settings size={20} />, path: '/optimization-settings' },
    { name: 'Activity Logs', icon: <History size={20} />, path: '/activity-logs' },
  ];

  return (
    <aside 
      className={`h-screen bg-slate-900 text-slate-300 flex flex-col fixed left-0 top-0 border-r border-slate-800 z-40 shadow-xl transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      
      {/* Top Header / Logo Section */}
      <div className={`h-16 flex items-center border-b border-slate-800/80 transition-all duration-300 ${
        isCollapsed ? 'justify-center px-0' : 'px-6'
      }`}>
        <Link to="/dashboard" className="flex items-center gap-2 group overflow-hidden">
          <img src={laundryLinkLogo} alt="LaundryLink Logo" className="h-8 w-8 object-contain shrink-0" />
          {!isCollapsed && (
            <span className="text-xl font-black italic tracking-tight whitespace-nowrap">
              <span className="text-sky-400">LAUNDRY</span>
              <span className="text-emerald-500">LINK</span>
            </span>
          )}
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-grow px-3 py-4 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.name}>
                <Link
                  to={item.path}
                  title={isCollapsed ? item.name : ''} // Tooltip kapag naka-collapse
                  className={`flex items-center gap-4 py-3 rounded-2xl font-bold transition-all duration-200 group ${
                    isCollapsed ? 'justify-center px-0' : 'px-5'
                  } ${
                    isActive 
                      ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' 
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <span className={`transition-colors duration-200 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-sky-400'
                  }`}>
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="text-sm tracking-wide whitespace-nowrap">{item.name}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer / System Status & Collapse Toggle */}
      <div className={`border-t border-slate-800/80 transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-4 m-4 space-y-3'}`}>
        
        {/* System Status (Nawawala kapag naka-collapse para hindi masikip) */}
        {!isCollapsed && (
          <div className="px-5 py-3 bg-slate-800/50 rounded-[20px] border border-slate-700/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                System Status
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-bold mt-1.5 px-1">
              <p>Mode: <span className="text-emerald-400 font-black">Optimization Active</span></p>
            </div>
          </div>
        )}

        {/* Action Buttons (Settings & Logout) */}
        <div className={`space-y-1 ${!isCollapsed ? 'px-1' : 'flex flex-col items-center'}`}>
          <button 
            onClick={() => navigate('/optimization-settings')}
            title="Account Settings"
            className={`w-full flex items-center rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition ${
              isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-4 py-2.5'
            }`}
          >
            <Settings size={16} className="text-slate-400 shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Account Settings</span>}
          </button>
          
          <button 
            onClick={() => navigate('/login')}
            title="Logout"
            className={`w-full flex items-center rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition ${
              isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-4 py-2.5'
            }`}
          >
            <LogOut size={16} className="text-rose-400 shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Logout</span>}
          </button>
        </div>

        {/* Collapse Toggle Button */}
        <div className={`pt-2 ${isCollapsed ? 'flex justify-center' : 'flex justify-end'}`}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-sky-500 hover:text-white text-slate-300 transition-all shadow-sm flex items-center justify-center border border-slate-700/50"
            aria-label="Toggle Sidebar"
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

      </div>
    </aside>
  );
};

export default Sidebar;