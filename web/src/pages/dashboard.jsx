import React, { useState, useEffect } from 'react';
import StatCard from '../components/ui/statcard';
import ForecastChart from '../components/charts/forecastcharts'; 
import OptimizationTip from '../components/ui/optimizationtip';
import MachineCard from '../components/machines/machinecard'; 
import BookingModal from '../components/modals/bookingmodal'; 
import { apiService } from '../services/APIservices'; 
import { Plus, Calendar } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false); // State to control modal visibility

  // Function to fetch dashboard data from the backend
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await apiService.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error("Backend connection pending:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Handler to submit new booking data to the API
  const handleCreateBooking = async (formData) => {
    try {
      const response = await apiService.createBooking({
        customer_name: formData.customerName,
        service_type: formData.serviceType,
        weight: parseFloat(formData.weight),
        status: 'Pending'
      });

      if (response) {
        // Refresh dashboard stats to reflect the new booking (e.g., pending count)
        loadDashboardData();
        console.log("Booking created successfully");
      }
    } catch (err) {
      console.error("Error creating booking:", err);
      alert("Failed to create booking. Please check backend connection.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500 mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Connecting to LaundryLink Services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen space-y-10">
      {/* 1. Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-slate-900 font-bold text-lg mb-1">
            {localStorage.getItem('shop_name') || 'Fresh & Clean Laundromat'}
          </h2>
          <p className="text-slate-500 text-sm font-medium mb-6">Real-time Performance Dashboard</p>
          <h1 className="text-4xl font-bold text-slate-900">Overview Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time performance metrics and predictive insights</p>
        </div>
        
        <div className="flex flex-col items-end gap-4">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <Calendar size={18} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Today</span>
          </div>
          {/* Trigger Modal on Click */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-sky-500 hover:bg-sky-600 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg flex items-center gap-2"
          >
            <Plus size={20} /> New Booking
          </button>
        </div>
      </div>

      {/* 2. Dynamic Stat Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Today's Revenue" 
          value={stats?.total_revenue ? `₱${stats.total_revenue.toLocaleString()}` : "₱0"} 
          trend={stats?.revenue_trend || "0%"} 
          type="revenue" 
        />
        <StatCard 
          title="Active Machine Utilization" 
          value={stats?.utilization_rate ? `${stats.utilization_rate}%` : "0%"} 
          trend={stats?.utilization_trend || "0%"} 
          type="utilization" 
        />
        <StatCard 
          title="Avg Income per Service" 
          value={stats?.avg_income ? `₱${stats.avg_income.toLocaleString()}` : "₱0"} 
          trend={stats?.income_trend || "0%"} 
          isNegative={stats?.income_trend?.includes('-')}
          type="income" 
        />
        <StatCard 
          title="Total Pending Bookings" 
          value={stats?.pending_bookings || "0"} 
          trend={stats?.bookings_trend || "0%"} 
          type="bookings" 
        />
      </div>

      {/* 3. Forecast & Smart Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Income & Booking Forecast</h2>
              <p className="text-slate-400 text-sm font-medium">Next 7 days prediction with service breakdown</p>
            </div>
            <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl">
              <button className="px-6 py-2.5 bg-white shadow-sm rounded-xl text-xs font-bold text-slate-800 border border-slate-100">Historical Trends</button>
              <button className="px-6 py-2.5 text-xs font-bold text-slate-400">Real-time Capacity</button>
            </div>
          </div>
          
          <div className="h-80 w-full mb-10">
            {stats?.forecast_data ? (
                <ForecastChart data={stats.forecast_data} /> 
            ) : (
                <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-medium text-sm">Waiting for historical data from backend...</p>
                </div>
            )}
          </div>

          {/* Service Breakdown Summary */}
          <div className="grid grid-cols-4 gap-4 border-t border-slate-50 pt-10">
            <div className="text-center">
              <p className="text-3xl font-black text-slate-900">{stats?.wash_only || 0}</p>
              <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">Wash Only</p>
            </div>
            <div className="text-center border-x border-slate-100">
              <p className="text-3xl font-black text-slate-900">{stats?.dry_only || 0}</p>
              <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">Dry Only</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-slate-900">{stats?.full_service || 0}</p>
              <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">Full Service</p>
            </div>
            <div className="text-center border-l border-slate-100">
              <p className="text-3xl font-black text-slate-900">{stats?.total_weight || 0} kg</p>
              <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">Total Weight</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <OptimizationTip 
            title={stats?.optimization?.title || "System Status"}
            message={stats?.optimization?.description || "Analysis will appear once the backend identifies optimization opportunities."}
            suggestion={stats?.optimization?.action_text || "Awaiting Data..."}
          />
        </div>
      </div>

      {/* 4. Real-time Machine Monitoring Section */}
      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-slate-800">Real-time Machine Monitoring</h2>
          <p className="text-slate-400 text-sm font-medium">Live status and profitability tracking</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(stats?.machines || [
            {id: 'M-01', type: 'Washer', status: 'Idle'},
            {id: 'M-02', type: 'Washer', status: 'Idle'},
            {id: 'D-01', type: 'Dryer', status: 'Idle'},
            {id: 'D-02', type: 'Dryer', status: 'Maintenance'}
          ]).map((machine) => (
            <MachineCard key={machine.id} {...machine} />
          ))}
        </div>
      </div>

      {/* Booking Modal Integration */}
      <BookingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleCreateBooking}
      />
    </div>
  );
};

export default Dashboard;