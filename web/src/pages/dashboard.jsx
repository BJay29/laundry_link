import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  Bell, 
  Activity,
  Inbox
} from 'lucide-react';

import Sidebar from '../components/common/Sidebar'; 
import StatCard from '../components/dashboard/StatCard';
import LiveFeed from '../components/dashboard/LiveFeed'; 
import MachineCapacity from '../components/dashboard/MachineCapacity';
import BookingNotif from '../components/modals/bookingNotif'; 
import MessageModal from '../components/modals/logoutModal'; 

const Dashboard = () => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const navigate = useNavigate(); 
  const dashboardBookings = []; 

  const handleConfirmLogout = () => {
    navigate('/login'); 
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-700 relative text-left">
      <Sidebar 
        activePage="Dashboard" 
        onLogoutClick={() => setIsLogoutModalOpen(true)} 
      />

      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        <header className="flex justify-between items-start mb-10 text-left">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">Real-time operational overview</p>
          </div>
          
          <button 
            onClick={() => setIsNotifOpen(true)}
            className="flex items-center gap-2 bg-sky-500 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-sky-600 transition-all active:scale-95 shadow-lg shadow-sky-100"
          >
            <Bell size={18} />
            Booking Requests
          </button>
        </header>

        <div className="grid grid-cols-12 gap-8 mb-10">
          {/* Live Feed - 7 columns */}
          <div className="col-span-12 lg:col-span-7">
             <LiveFeed bookings={dashboardBookings} />
          </div>

          <div className="col-span-12 lg:col-span-5">
             <MachineCapacity />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StatCard title="Today's Bookings" value="0" subtext="Waiting for data" isPrimary={false} icon={BookOpen} />
          <StatCard title="Today's Revenue" value="₱0" subtext="Waiting for data" isPrimary={false} icon={Activity} />
          <StatCard title="Active Customers" value="0" subtext="THIS WEEK" isPrimary={true} icon={Users} />
        </div>
      </main>

      <BookingNotif isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
      <MessageModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} onConfirm={handleConfirmLogout} />
    </div>
  );
};

export default Dashboard;