import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  Bell, 
  Activity
} from 'lucide-react';
// Common Components
import Sidebar from '../components/common/Sidebar';
import Button from '../components/common/Button';
// Dashboard Specific Components
import StatCard from '../components/dashboard/StatCard';
import LiveFeed from '../components/dashboard/LiveFeed';
import MachineCapacity from '../components/dashboard/MachineCapacity';
// Modals
import BookingNotif from '../components/modals/bookingNotif'; 
import MessageModal from '../components/modals/logoutModal'; 
import { dashboardBookings } from '../utils/mockData';

const Dashboard = () => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const navigate = useNavigate(); 

  const handleConfirmLogout = () => {
    // Clear session details here if necessary
    navigate('/login'); 
  };

  return (
    <div className="flex min-h-screen bg-[#f1f5f9] font-sans text-slate-700 relative text-left">
      
      {/* Sidebar with Logout Trigger */}
      <Sidebar 
        activePage="Dashboard" 
        onLogoutClick={() => setIsLogoutModalOpen(true)} 
      />

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        <header className="flex justify-between items-start mb-8 text-left">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 text-sm font-medium">Real-time operational overview</p>
          </div>
          
          <Button 
            onClick={() => setIsNotifOpen(true)}
            Icon={Bell}
            variant="primary"
          >
            Booking Requests
          </Button>
        </header>

        {/* --- TOP GRID ROW --- */}
        <div className="grid grid-cols-12 gap-6 mb-8 text-left">
          <div className="col-span-12 lg:col-span-7">
            <LiveFeed bookings={dashboardBookings} />
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