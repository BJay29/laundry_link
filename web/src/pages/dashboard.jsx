import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  LineChart, 
  BookOpen, 
  Users, 
  Bell, 
  Activity,
  MapPin,
  Store,
  LogOut 
} from 'lucide-react';

// Import sub-components from your dashboard folder
import StatCard from '../components/dashboard/StatCard';
import LiveFeed from '../components/dashboard/LiveFeed';
import MachineCapacity from '../components/dashboard/MachineCapacity';

// Import modals
import BookingNotif from '../components/modals/bookingNotif'; 
import MessageModal from '../components/modals/logoutModal'; 

const Dashboard = () => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const navigate = useNavigate(); 

  const handleConfirmLogout = () => {
    // Clear session details here if necessary
    navigate('/login'); 
  };

  const bookings = [
    { name: "Pedro Garcia", machine: "Washer #1", time: "08:07 AM", status: "JUST NOW" },
    { name: "Miguel Rivera", machine: "Dryer #1", time: "08:05 AM", status: "JUST NOW" },
    { name: "Ana Cruz", machine: "Washer #2", time: "08:02 AM", status: "JUST NOW" },
    { name: "Sofia Mendoza", machine: "Washer #1", time: "07:53 AM", status: "JUST NOW" },
    { name: "Carlos Lopez", machine: "Dryer #2", time: "07:47 AM", status: "JUST NOW" },
  ];

  return (
    <div className="flex min-h-screen bg-[#f1f5f9] font-sans text-slate-700 relative text-left">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-[#0ea5e9] mb-1">
            <Activity size={20} />
            <span className="font-bold text-lg tracking-tight">LaundryLink</span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-left">Management Suite</p>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="bg-[#1e293b] text-white p-4 rounded-xl mb-6 shadow-lg shadow-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-700 rounded-lg"><Store size={18} /></div>
              <div>
                <p className="font-bold text-sm text-sky-400 leading-tight text-left">LaundryLink</p>
                <p className="text-[9px] text-slate-400 flex items-center gap-1">
                  <MapPin size={10} /> Sampaloc Branch
                </p>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            <button className="flex items-center gap-3 w-full p-3 bg-sky-100 text-sky-600 rounded-lg font-bold text-sm transition-all">
              <LayoutDashboard size={18} /> Dashboard
            </button>
            <button className="flex items-center gap-3 w-full p-3 text-slate-500 hover:bg-slate-50 rounded-lg text-sm transition-all">
              <LineChart size={18} /> Forecasting
            </button>
            <button className="flex items-center gap-3 w-full p-3 text-slate-500 hover:bg-slate-50 rounded-lg text-sm transition-all">
              <BookOpen size={18} /> All Bookings
            </button>
            <button className="flex items-center gap-3 w-full p-3 text-slate-500 hover:bg-slate-50 rounded-lg text-sm transition-all">
              <Users size={18} /> Customers
            </button>
          </nav>
        </div>

        {/* --- PROFILE & LOGOUT SECTION --- */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#0ea5e9] rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md shadow-sky-100">
                BJ
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800 leading-none mb-1">BeeJay</p>
                <p className="text-[10px] text-slate-400 font-medium">Administrator</p>
              </div>
            </div>
            <button 
              onClick={() => setIsLogoutModalOpen(true)}
              title="Logout"
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        <header className="flex justify-between items-start mb-8 text-left">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 text-sm font-medium">Real-time operational overview</p>
          </div>
          
          <button 
            onClick={() => setIsNotifOpen(true)}
            className="bg-[#0ea5e9] hover:bg-sky-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-sky-100 flex items-center gap-2 transition-all active:scale-95"
          >
            <Bell size={18} /> Booking Requests 
          </button>
        </header>

        {/* --- TOP GRID ROW (Live Feed & Machine Capacity) --- */}
        <div className="grid grid-cols-12 gap-6 mb-8 text-left">
          <div className="col-span-12 lg:col-span-7">
            <LiveFeed bookings={bookings} />
          </div>

          <div className="col-span-12 lg:col-span-5">
            <MachineCapacity />
          </div>
        </div>

        {/* --- STATS CARDS ROW --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <StatCard 
            title="Today's Bookings" 
            value="6" 
            subtext="↑ 12% from yesterday" 
            color="bg-[#38bdf8] shadow-sky-100/50" 
            icon={BookOpen} 
          />
          <StatCard 
            title="Today's Revenue" 
            value="₱4,912" 
            subtext="↑ 8% from yesterday" 
            color="bg-[#22c55e] shadow-green-100/50" 
            icon={Activity} 
          />
          <StatCard 
            title="Active Customers" 
            value="36" 
            subtext="THIS WEEK" 
            color="bg-[#a855f7] shadow-purple-100/50" 
            icon={Users} 
          />
        </div>
      </main>

      {/* --- MODALS --- */}
      <BookingNotif 
        isOpen={isNotifOpen} 
        onClose={() => setIsNotifOpen(false)} 
      />

      <MessageModal 
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />

    </div>
  );
};

export default Dashboard;