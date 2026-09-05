import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Calendar, 
  RefreshCw, 
  Monitor, 
  Activity, 
  TrendingUp, 
  CheckCircle, 
  DollarSign,
  History
} from 'lucide-react';
import apiService from '../services/APIservices';

// Component Imports
import StatCard from '../components/ui/statcard';
import ForecastCharts from '../components/charts/forecastcharts';
import OptimizationTip from '../components/ui/optimizationtip';
import MachineGrid from '../components/machines/machinegrid';
import BookingModal from '../components/modals/bookingmodal';
import HistoryModal from '../components/modals/historymodal'; 

/**
 * DASHBOARD COMPONENT
 * The central intelligence hub for LaundryLink.
 * Visualizes running operational tasks, data telemetry streams, and hardware metrics.
 * UPDATED: ForecastCharts chart container no longer uses a fixed height —
 * the redesigned component renders two stacked charts and expands naturally.
 * UPDATED: forecast mapping now carries rain_mm through from the backend,
 * and modelTier (shop_model / pooled_model / weather_only) is tracked
 * separately so ForecastCharts can show the weather outlook strip and the
 * tier badge, and can hide the bookings/income charts entirely when the
 * backend has no basis yet to predict them (brand-new shop, weather_only).
 */
const Dashboard = () => {
  // State Management
  const [stats, setStats] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [modelTier, setModelTier] = useState(null);
  const [machines, setMachines] = useState([]);
  const [insightData, setInsightData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isInsightApplied, setIsInsightApplied] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  /**
   * DATA SYNCHRONIZATION ENGINE
   * Fetches dashboard statistics, telemetry streams, and structural updates concurrently.
   */
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [statsResult, machinesResult, forecastResult, insightResult] = await Promise.allSettled([
        apiService.getDashboardStats(),
        apiService.getMachines(),
        apiService.getForecastData(),
        apiService.getOperationalInsights(),
      ]);

      // 1. Process KPIs
      if (statsResult.status === 'fulfilled' && statsResult.value) {
        const rawData = statsResult.value;
        setStats({
          ...rawData,
          display_revenue: rawData.today_revenue || 0,
          display_trend: rawData.income_growth || 0,
          avg_per_service: rawData.avg_per_service || 0,
        });
      }

      // 2. Process Machine Telemetry
      if (machinesResult.status === 'fulfilled') {
        setMachines(machinesResult.value || []);
      }

      // 3. Process AI Forecast Graph
      // UPDATED: rain_mm now carried through per-day, and model_tier
      // (same value on every row of a given response) is lifted into
      // its own piece of state so ForecastCharts can badge/adapt to it.
      if (forecastResult.status === 'fulfilled' && forecastResult.value?.forecast) {
        const rawForecast = forecastResult.value.forecast;
        const mappedForecast = rawForecast.map(item => ({
          day: item.label.split(',')[0], 
          bookings: item.predicted_bookings ?? 0,
          income: item.projected_income ?? 0,
          rain_mm: item.rain_mm ?? 0,
        }));
        setForecast(mappedForecast);
        setModelTier(rawForecast[0]?.model_tier || null);
      }

      // 4. Process Operational Insights (DSS)
      if (insightResult.status === 'fulfilled') {
        setInsightData(insightResult.value);
        if (insightResult.value?.hasIssue) {
          setIsInsightApplied(false);
        }
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Critical Telemetry Failure:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // System Heartbeat — automated polling every 60 seconds
  useEffect(() => {
    loadDashboardData();
    const heartbeat = setInterval(() => loadDashboardData(true), 60000);
    return () => clearInterval(heartbeat);
  }, [loadDashboardData]);

  const handleBookingSuccess = () => {
    setIsModalOpen(false);
    loadDashboardData(true);
  };

  const handleApplyInsight = () => {
    setIsInsightApplied(true);
  };

  // Initial load screen while data has not yet arrived
  if (loading && !stats && machines.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-sky-500 border-r-transparent shadow-2xl" />
            <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sky-500" size={24} />
          </div>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mt-8 animate-pulse">
            Syncing Command...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen space-y-10 font-sans">

      {/* HEADER SECTION */}
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
          <h1 className="text-6xl font-black text-slate-900 mt-2 tracking-tighter italic uppercase">Dashboard</h1>
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
            onClick={() => setIsHistoryOpen(true)}
            className="bg-white border border-slate-200 text-slate-600 p-5 rounded-[28px] font-black transition-all hover:bg-slate-100 flex items-center justify-center gap-3"
          >
            <History size={22} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 lg:flex-none bg-sky-500 hover:bg-sky-600 text-white px-10 py-5 rounded-[28px] font-black transition-all shadow-xl shadow-sky-100 flex items-center justify-center gap-3 hover:scale-[1.03] active:scale-95"
          >
            <Plus size={22} strokeWidth={4} /> ADD BOOKING
          </button>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Today Revenue"    value={stats?.today_revenue || 0}             trend={`${stats?.income_growth || 0}%`} type="revenue" />
        <StatCard title="Active Machines"  value={stats?.active_machines || "0"}         trend="In Use"   type="utilization" />
        <StatCard title="Avg. Per Service" value={Number(stats?.avg_per_service || 0)}   trend="Stable"   type="avg_per_service" />
        <StatCard title="Expected Bookings" value={stats?.predicted_bookings_today || "0"} trend="Forecast" type="bookings" />
      </div>

      {/* ANALYTICS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* 
          FORECAST CHARTS PANEL
          Fixed height wrapper removed — ForecastCharts now renders the
          weather strip, tier badge, and two stacked charts (or the
          insufficient-data notice) and needs to grow vertically to fit.
        */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[56px] border border-slate-100 shadow-sm flex flex-col min-w-0">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-2 text-sky-500 mb-1">
                <TrendingUp size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">AI Prediction Engine</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Income & Booking Forecast</h2>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Last Sync</span>
              <p className="text-xs font-bold text-slate-500">{lastUpdated.toLocaleTimeString()}</p>
            </div>
          </div>

          {/* 
            Chart area: no fixed height set here — ForecastCharts grows
            naturally to fit the weather strip + badge + two charts.
          */}
          <div className="w-full mb-8 relative" style={{ minWidth: '0' }}>
            {forecast.length > 0 ? (
              <ForecastCharts data={forecast} modelTier={modelTier} />
            ) : (
              <div className="flex flex-col items-center justify-center py-24 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200">
                <RefreshCw className="text-slate-200 mb-4 animate-spin" size={48} />
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Aggregating Data...</p>
              </div>
            )}
          </div>

          {/* Service breakdown row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 border-t border-slate-50 pt-8 mt-auto">
            <BreakdownItem label="Full Service" value={stats?.full_service || 0} />
            <BreakdownItem label="Titan Wash"   value={stats?.titan_wash || 0} />
            <BreakdownItem label="Regular Wash" value={stats?.regular_wash || 0} />
            <BreakdownItem label="Comforter"    value={stats?.comforter || 0} />
            <BreakdownItem label="Total Load"   value={`${stats?.total_kg || 0}kg`} />
          </div>
        </div>

        {/* OPTIMIZATION INSIGHT PANEL */}
        <div className="lg:col-span-1">
          <OptimizationTip
            data={insightData}
            isApplied={isInsightApplied}
            onApply={handleApplyInsight}
          />
        </div>
      </div>

      {/* HARDWARE TELEMETRY */}
      <div className="bg-white p-10 rounded-[56px] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-500 mb-1">
              <CheckCircle size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Live status and profitability tracking
              </span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Real-Time Machine Monitoring</h2>
          </div>
          <button
            onClick={() => loadDashboardData(true)}
            className="p-4 hover:bg-slate-50 rounded-2xl transition-all"
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : 'text-slate-300'} />
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
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Breakdown row item
// ─────────────────────────────────────────────────────────────────────────────
const BreakdownItem = ({ label, value }) => (
  <div className="flex flex-col items-center justify-center p-4 rounded-[28px] hover:bg-slate-50 transition-all border border-transparent">
    <p className="text-2xl font-black text-slate-900 tracking-tighter">{value}</p>
    <p className="text-slate-400 text-[9px] font-black uppercase mt-1 tracking-widest">{label}</p>
  </div>
);

export default Dashboard;
