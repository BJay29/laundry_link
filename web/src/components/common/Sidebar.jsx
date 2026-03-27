import React from 'react';
import { Link } from 'react-router-dom'; 
import { 
  Activity, 
  Store, 
  MapPin, 
  LayoutDashboard, 
  LineChart, 
  BookOpen, 
  Users, 
  LogOut 
} from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, active, to }) => (
  <Link 
    to={to} 
    className={`flex items-center gap-3 w-full p-3 rounded-lg font-bold text-sm transition-all ${
      active 
        ? 'bg-sky-100 text-sky-600 shadow-sm' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
    }`}
  >
    <Icon size={18} /> 
    <span>{label}</span>
  </Link>
);

const Sidebar = ({ activePage = 'Dashboard', onLogoutClick }) => {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 shadow-sm z-50">
      
      {/* --- LOGO SECTION --- */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-2 text-[#0ea5e9] mb-1">
          <Activity size={20} />
          <span className="font-bold text-lg tracking-tight">LaundryLink</span>
        </div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-left text-nowrap">
          Professional Management
        </p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {/* --- BRANCH INFO CARD --- */}
        <div className="bg-[#1e293b] text-white p-4 rounded-xl mb-6 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-700 rounded-lg text-sky-400">
              <Store size={18} />
            </div>
            <div className="text-left overflow-hidden">
              <p className="font-bold text-sm text-sky-400 leading-tight truncate">LaundryLink</p>
              <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin size={10} className="shrink-0" /> 
                <span className="truncate">Sampaloc Branch</span>
              </p>
            </div>
          </div>
        </div>

        {/* --- NAVIGATION LINKS --- */}
        <nav className="space-y-1 text-left">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            to="/dashboard" 
            active={activePage === 'Dashboard'} 
          />
          <SidebarItem 
            icon={LineChart} 
            label="Forecasting" 
            to="/forecasting" 
            active={activePage === 'Forecasting'} 
          />
          <SidebarItem 
            icon={BookOpen} 
            label="All Bookings" 
            to="/all-bookings" 
            active={activePage === 'Bookings'} 
          />
          <SidebarItem 
            icon={Users} 
            label="Customers" 
            to="/customers" 
            active={activePage === 'Customers'} 
          />
        </nav>
      </div>

      {/* --- PROFILE & LOGOUT SECTION --- */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-[#0ea5e9] rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0">
              BJ
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-xs font-bold text-slate-800 leading-none mb-1 truncate">BeeJay</p>
              <p className="text-[10px] text-slate-400 font-medium truncate">Administrator</p>
            </div>
          </div>
          <button 
            onClick={onLogoutClick}
            title="Logout"
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90 shrink-0"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;