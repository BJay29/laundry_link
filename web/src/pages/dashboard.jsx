import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Calendar, RefreshCw, Layers, Monitor, Activity, TrendingUp, CheckCircle } from 'lucide-react';
import apiService from '../services/APIservices'; // Updated path casing

import StatCard from '../components/ui/statcard';
import ForecastChart from '../components/charts/forecastcharts';
import OptimizationTip from '../components/ui/optimizationtip';
import MachineGrid from '../components/machines/machinegrid';
import BookingModal from '../components/modals/bookingmodal';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Parallel fetch for optimal performance
      const [statsResult, machinesResult] = await Promise.allSettled([
        apiService.getDashboardStats(),
        apiService.getMachines(),
      ]);

      if (statsResult.status === 'fulfilled' && statsResult.value) {
        setStats(statsResult.value);
      }

      if (machinesResult.status === 'fulfilled') {
        setMachines(machinesResult.value || []);
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Dashboard Sync Error:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    // Refresh every 60 seconds to keep stats and hardware health updated
    const interval = setInterval(() => loadDashboardData(true), 60000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const handleBookingSuccess = () => {
    setIsModalOpen(false);
    // Refresh dashboard to reflect new revenue and machine 'Busy' status
    loadDashboardData(true);
  };

  // ── LOADING STATE ──────────────────────────────────────────────────────────
  if (loading && !stats && machines.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-sky-500 border-r-transparent shadow-2xl" />
            <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sky-500" size={24} />
          </div>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mt-8 animate-pulse">
            Booting Command Center...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen space-y-10 font-sans">

      {/* SECTION 1: HEADER & ACTIONS */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-slate-900 rounded-xl shadow-lg">
              <Monitor size={18} className="text-white" />
            </div>
            <h2 className="text-slate-900 font-black text-lg tracking-tight uppercase">
              {localStorage.getItem('shop_name') || 'Fresh & Clean Hub'}
            </h2>
            <div className="flex items-center gap-1.5 ml-2">
               <div className={`w-2 h-2 rounded-full ${refreshing ? 'bg-sky-400 animate-ping' : 'bg-emerald-500'}`} />
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 {refreshing ? 'Syncing...' : 'System Live'}
               </span>
            </div>
          </div>
          <h1 className="text-6xl font-black text-slate-900 mt-2 tracking-tighter italic">Command</h1>
          <p className="text-slate-500 text-sm font-bold mt-1 max-w-md">
            Visualizing real-time operational efficiency and predictive growth models.
          </p>
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="hidden md:flex flex-col items-end bg-white px-6 py-3 rounded-[28px] border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-sky-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Session</span>
            </div>
            <span className="text-sm font-black text-slate-800">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 lg:flex-none bg-sky-500 hover:bg-sky-600 text-white px-10 py-5 rounded-[28px] font-black transition-all shadow-xl shadow-sky-100 flex items-center justify-center gap-3 hover:scale-[1.03] active:scale-95"
          >
            <Plus size={22} strokeWidth={4} /> Create Booking
          </button>
        </div>
      </div>

      {/* SECTION 2: KEY PERFORMANCE INDICATORS (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Daily Gross Revenue"
          value={stats?.total_revenue ? `₱${stats.total_revenue.toLocaleString()}` : "₱0"}
          trend={stats?.revenue_trend || "+0%"}
          type="revenue"
        />
        <StatCard
          title="Hardware Utilization"
          value={stats?.utilization_rate ? `${stats.utilization_rate}%` : "0%"}
          trend={stats?.utilization_trend || "Stable"}
          type="utilization"
        />
        <StatCard
          title="Avg Transaction"
          value={stats?.avg_income ? `₱${stats.avg_income.toLocaleString()}` : "₱0"}
          trend={stats?.income_trend || "0%"}
          isNegative={stats?.income_trend?.includes('-')}
          type="income"
        />
        <StatCard
          title="Active Queue"
          value={stats?.pending_bookings || "0"}
          trend={stats?.bookings_trend || "Live"}
          type="bookings"
        />
      </div>

      {/* SECTION 3: ANALYTICS ENGINE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[56px] border border-slate-100 shadow-sm relative overflow-hidden">
          {/* Subtle Background Accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-50/50 rounded-full blur-3xl -mr-32 -mt-32" />
          
          <div className="flex justify-between items-start mb-10 relative z-10">
            <div>
              <div className="flex items-center gap-2 text-sky-500 mb-1">
                <TrendingUp size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Analytics Engine</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Revenue Forecast</h2>
              <p className="text-slate-400 text-xs font-bold mt-1">
                7-Day Predictive Modeling based on historical traffic.
              </p>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Last Updated</span>
                <span className="text-xs font-bold text-slate-500">{lastUpdated.toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="h-80 w-full mb-10 relative z-10">
            {stats?.forecast_data?.length > 0 ? (
              <ForecastChart data={stats.forecast_data} />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200">
                <RefreshCw className="text-slate-200 mb-4 animate-spin-slow" size={48} />
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">
                  Waiting for backend data cycles...
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-slate-50 pt-10 relative z-10">
            <BreakdownItem label="Wash Cycles" value={stats?.wash_only || 0} />
            <BreakdownItem label="Dry Cycles"  value={stats?.dry_only || 0} />
            <BreakdownItem label="Full Service" value={stats?.full_service || 0} />
            <BreakdownItem label="Net Load"   value={`${stats?.total_weight || 0}kg`} />
          </div>
        </div>

        <div className="lg:col-span-1">
          <OptimizationTip
            title={stats?.optimization?.title || "Operational Insight"}
            message={stats?.optimization?.description || "Backend is currently monitoring machine idle times to suggest peak-hour staffing adjustments."}
            suggestion={stats?.optimization?.action_text || "Analyzing Patterns"}
          />
        </div>
      </div>

      {/* SECTION 4: HARDWARE TELEMETRY */}
      <div className="bg-white p-10 rounded-[56px] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-500 mb-1">
              <CheckCircle size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Hardware Telemetry</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Machine Status</h2>
            <p className="text-slate-400 text-xs font-bold">
              Real-time load balancing and health monitoring for all units.
            </p>
          </div>
          <button 
            onClick={() => loadDashboardData(true)}
            className="p-4 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-sky-500"
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        <MachineGrid
          machines={machines}
          loading={loading && machines.length === 0}
          onUpdate={() => loadDashboardData(true)}
        />
      </div>

      {/* MODALS */}
      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleBookingSuccess}
      />
    </div>
  );
};

// ── SUB-COMPONENTS ───────────────────────────────────────────────────────────

const BreakdownItem = ({ label, value }) => (
  <div className="group flex flex-col items-center justify-center p-6 rounded-[32px] hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
    <p className="text-4xl font-black text-slate-900 group-hover:text-sky-500 transition-colors tracking-tighter">
      {value}
    </p>
    <p className="text-slate-400 text-[10px] font-black uppercase mt-2 tracking-[0.2em] whitespace-nowrap">
      {label}
    </p>
  </div>
);

export default Dashboard;