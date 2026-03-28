import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; 
import { 
  Activity, 
  Store, 
  MapPin, 
  LayoutDashboard, 
  LineChart, 
  BookOpen, 
  Users, 
  LogOut,
  X,
  AlertTriangle
} from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, active, to }) => (
  <Link 
    to={to} 
    className={`flex items-center gap-3 w-full p-3 rounded-lg font-bold text-sm transition-all duration-200 ${
      active 
        ? 'bg-sky-100 text-sky-600 shadow-sm translate-x-1' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:translate-x-1'
    }`}
  >
    <Icon size={18} className={active ? 'animate-pulse' : ''} /> 
    <span>{label}</span>
  </Link>
);

const Sidebar = ({ activePage = 'Dashboard' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleConfirmLogout = () => {
    // Linisin ang local storage kung kinakailangan
    // localStorage.clear();
    setIsModalOpen(false);
    navigate("/"); 
  };

  return (
    <>
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
          <div className="bg-[#1e293b] text-white p-4 rounded-xl mb-6 shadow-md transition-transform hover:scale-[1.02]">
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
            <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/dashboard" active={activePage === 'Dashboard'} />
            <SidebarItem icon={LineChart} label="Forecasting" to="/forecasting" active={activePage === 'Forecasting'} />
            {/* INAYOS: Match 'All Bookings' sa 'Bookings' active state */}
            <SidebarItem icon={BookOpen} label="All Bookings" to="/all-bookings" active={activePage === 'Bookings'} />
            <SidebarItem icon={Users} label="Customers" to="/customers" active={activePage === 'Customers'} />
          </nav>
        </div>

        {/* --- PROFILE & LOGOUT SECTION --- */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 bg-sky-500 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0 ring-2 ring-white">
                BJ
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-xs font-bold text-slate-800 leading-none mb-1 truncate">BeeJay</p>
                <p className="text-[10px] text-slate-400 font-medium truncate">Administrator</p>
              </div>
            </div>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              title="Logout"
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90 shrink-0"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* --- LOGOUT CONFIRMATION MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
            onClick={() => setIsModalOpen(false)}
          ></div>
          
          {/* Modal Content */}
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm relative shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle size={32} />
              </div>
              
              <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Wait, BeeJay!</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed font-medium">
                Are you sure you want to end your session? Your progress is safely stored.
              </p>
              
              <div className="flex flex-col gap-3 w-full">
                <button 
                  onClick={handleConfirmLogout}
                  className="w-full px-6 py-3.5 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 shadow-lg shadow-red-200 transition-all active:scale-95"
                >
                  Yes, Log me out
                </button>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-full px-6 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all active:scale-95"
                >
                  Stay Connected
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;