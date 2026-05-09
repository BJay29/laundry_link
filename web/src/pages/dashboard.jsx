import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Calendar, RefreshCw, Monitor, Activity, TrendingUp, CheckCircle } from 'lucide-react';
import apiService from '../services/APIservices';

// Component Imports
import StatCard from '../components/ui/statcard';
import ForecastChart from '../components/charts/forecastcharts';
import OptimizationTip from '../components/ui/optimizationtip';
import MachineGrid from '../components/machines/machinegrid';
import BookingModal from '../components/modals/bookingmodal';

/**
 * DASHBOARD COMPONENT
 * The central intelligence hub for LaundryLink.
 * Manages real-time data orchestration between the FastAPI backend and React frontend.
 */
const Dashboard = () => {
  // State Management
  const [stats, setStats] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  /**
   * DATA SYNCHRONIZATION ENGINE
   * Executes concurrent API calls to minimize network waterfall delays.
   * Logic specifically maps backend analytics to frontend KPI cards.
   */
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Concurrent fetching for performance optimization
      const [statsResult, machinesResult, forecastResult] = await Promise.allSettled([
        apiService.getDashboardStats(),
        apiService.getMachines(),
        apiService.getForecastData(),
      ]);

      // 1. Process Dashboard KPIs (Revenue, Utilization, etc.)
      // Mapping backend keys to ensure the UI has the correct data context
      if (statsResult.status === 'fulfilled' && statsResult.value) {
        const rawData = statsResult.value;
        setStats({
          ...rawData,
          // Fallback mapping for consistency with JSX expectations
          display_revenue: rawData.today_revenue || 0,
          display_trend: rawData.income_growth || 0,
        });
      }

      // 2. Process Machine Telemetry (Status, Profitability per unit)
      if (machinesResult.status === 'fulfilled') {
        setMachines(machinesResult.value || []);
      }

      // 3. Process AI Forecast Graph Data
      // Ensures data is mapped into the format Recharts expects (day, bookings, income)
      if (forecastResult.status === 'fulfilled' && forecastResult.value?.forecast) {
        const mappedForecast = forecastResult.value.forecast.map(item => ({
          day: item.label.split(',')[0], // Converts "May 10, Sun" to "May 10"
          bookings: item.predicted_bookings || 0,
          income: item.projected_income || 0
        }));
        setForecast(mappedForecast);
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Critical Telemetry Failure:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /**
   * SYSTEM HEARTBEAT
   * Automatically refreshes data every 60 seconds to keep machine timers
   * and live revenue streams accurate without manual intervention.
   */
  useEffect(() => {
    loadDashboardData();
    const heartbeat = setInterval(() => loadDashboardData(true), 60000);
    return () => clearInterval(heartbeat);
  }, [loadDashboardData]);

  const handleBookingSuccess = () => {
    setIsModalOpen(false);
    // Immediate force-sync to update machine states to 'Busy' instantly
    loadDashboardData(true); 
  };

  // --- INITIAL LOAD STATE (CINEMATIC PULSE) ---
  if (loading && !stats && machines.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-sky-500 border-r-transparent shadow-2xl" />
            <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sky-500" size={24} />
          </div>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mt-8 animate-pulse">
            Establishing Link...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen space-y-10 font-sans">

      {/* SECTION 1: HEADER & IDENTITY */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-slate-900 rounded-xl shadow-lg">
              <Monitor size={18} className="text-white" />
            </div>
            <h2 className="text-slate-900 font-black text-lg tracking-tight uppercase">
              {localStorage.getItem('shop_name') || 'Main Command'}
            </h2>
            <div className="flex items-center gap-1.5 ml-2">
                <div className={`w-2 h-2 rounded-full ${refreshing ? 'bg-sky-400 animate-ping' : 'bg-emerald-500'}`} />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {refreshing ? 'Syncing...' : 'Live'}
                </span>
            </div>
          </div>
          <h1 className="text-6xl font-black text-slate-900 mt-2 tracking-tighter italic uppercase">Overview</h1>
          <p className="text-slate-500 text-sm font-bold mt-1 max-w-md">
            Managing operations and utility overhead for <span className="text-sky-500">Naga City</span> Branch.
          </p>
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="hidden md:flex flex-col items-end bg-white px-6 py-3 rounded-[28px] border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-sky-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operation Date</span>
            </div>
            <span className="text-sm font-black text-slate-800">
              {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 lg:flex-none bg-sky-500 hover:bg-sky-600 text-white px-10 py-5 rounded-[28px] font-black transition-all shadow-xl shadow-sky-100 flex items-center justify-center gap-3 hover:scale-[1.03] active:scale-95"
          >
            <Plus size={22} strokeWidth={4} /> NEW BOOKING
          </button>
        </div>
      </div>

      {/* SECTION 2: KEY PERFORMANCE INDICATORS (KPIs) - Mapped to real backend keys */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Daily Revenue"
          value={stats?.today_revenue ? `₱${Number(stats.today_revenue).toLocaleString()}` : "₱0"}
          trend={`${stats?.income_growth || 0}%`}
          type="revenue"
        />
        <StatCard
          title="Machine Utilization"
          value={stats?.utilization_rate ? `${stats.utilization_rate}%` : "0%"}
          trend="Active"
          type="utilization"
        />
        <StatCard
          title="AI Accuracy"
          value={stats?.accuracy_rate ? `${stats.accuracy_rate}%` : "0%"}
          trend="Stable"
          type="income"
        />
        <StatCard
          title="Expected Bookings"
          value={stats?.predicted_bookings_today || "0"}
          trend="Today"
          type="bookings"
        />
      </div>

      {/* SECTION 3: AI ANALYTICS & REVENUE FORECASTING */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[56px] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
          
          <div className="flex justify-between items-start mb-10 relative z-10">
            <div>
              <div className="flex items-center gap-2 text-sky-500 mb-1">
                <strong className="text-sky-500 font-black"><TrendingUp size={16} /></strong>
                <span className="text-[10px] font-black uppercase tracking-widest">AI Prediction Engine</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Demand Forecast</h2>
              <p className="text-slate-400 text-xs font-bold mt-1">
                Projected revenue and volume for the next 7 operational days.
              </p>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Last Cloud Sync</span>
                <span className="text-xs font-bold text-slate-500">{lastUpdated.toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="h-80 w-full mb-10 relative z-10">
            {forecast.length > 0 ? (
              <ForecastChart data={forecast} />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200">
                <RefreshCw className="text-slate-200 mb-4 animate-spin" size={48} />
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">
                  Analyzing Historical Data...
                </p>
              </div>
            )}
          </div>

          {/* SERVICE BREAKDOWN: Displays volume counts from the stats payload */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-slate-50 pt-10 relative z-10">
            <BreakdownItem label="Wash Only" value={stats?.wash_only || 0} />
            <BreakdownItem label="Dry Only"  value={stats?.dry_only || 0} />
            <BreakdownItem label="Full Service" value={stats?.full_service || 0} />
            <BreakdownItem label="Active Units" value={stats?.active_machines || 0} />
          </div>
        </div>

        <div className="lg:col-span-1">
          <OptimizationTip
            title={stats?.optimization?.title || "Operational Insight"}
            message={stats?.optimization?.description || "The AI system is analyzing historical power consumption to optimize your dryer cycles."}
            suggestion={stats?.optimization?.action_text || "Insights Syncing..."}
          />
        </div>
      </div>

      {/* SECTION 4: HARDWARE TELEMETRY GRID */}
      <div className="bg-white p-10 rounded-[56px] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-500 mb-1">
              <CheckCircle size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Hardware Telemetry</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Machine Status</h2>
            <p className="text-slate-400 text-xs font-bold">
              Monitoring active cycles and individual net profitability rates.
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

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleBookingSuccess}
      />
    </div>
  );
};

/**
 * HELPER COMPONENT: BREAKDOWN ITEM
 * Renders individual service metrics with hover effects.
 */
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