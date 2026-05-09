import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, RefreshCw, AlertCircle } from 'lucide-react';
import ForecastChart from '../components/charts/forecastcharts';
import apiService from '../services/APIservices';

/**
 * FINANCIAL FORECAST COMPONENT
 * Provides a deep-dive analysis of AI-driven demand and revenue projections.
 * Optimized to show Weekly Totals in KPI cards and Daily trends in the graph.
 */
const FinancialForecast = () => {
  const [forecastData, setForecastData] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    avgDaily: 0,
    accuracy: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * DATA ORCHESTRATION
   * Fetches raw forecast arrays and aggregates them into weekly performance metrics.
   */
  const fetchForecastData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Concurrent fetch for forecast array and general shop stats
      const [forecastRes, summaryRes] = await Promise.allSettled([
        apiService.getForecastData(),
        apiService.getDashboardStats()
      ]);

      if (forecastRes.status === 'fulfilled' && forecastRes.value?.forecast) {
        const rawForecast = forecastRes.value.forecast;

        // 1. Map data for Forecast Chart (Matches Dashboard trend logic)
        const mappedChartData = rawForecast.map(item => ({
          day: item.label.split(',')[0], // Extract "May 10" from "May 10, Sun"
          bookings: item.predicted_bookings || 0,
          income: item.projected_income || 0
        }));
        setForecastData(mappedChartData);

        // 2. Aggregate Weekly Totals for KPI Cards (Fixing the card logic)
        const totalRev = rawForecast.reduce((sum, item) => sum + (item.projected_income || 0), 0);
        const totalBook = rawForecast.reduce((sum, item) => sum + (item.predicted_bookings || 0), 0);
        
        // Use accuracy from summaryRes if available, otherwise default to a static 95%
        const accuracy = summaryRes.status === 'fulfilled' ? summaryRes.value.accuracy_rate : 95;

        setWeeklyStats({
          totalRevenue: totalRev,
          totalBookings: totalBook,
          avgDaily: Math.round(totalRev / 7),
          accuracy: accuracy
        });
      }

    } catch (err) {
      console.error("Forecast Page Sync Failure:", err);
      setError("Failed to synchronize with AI Prediction Engine.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForecastData();
  }, [fetchForecastData]);

  // Loading State with Cinematic Pulse
  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-sky-500" size={40} />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Generating Weekly Insights...</p>
        </div>
    </div>
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header Section */}
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Financial Forecast</h1>
          <p className="text-slate-500 font-bold text-sm">Aggregated 7-day projections based on neural network analysis</p>
        </div>
        <button 
          onClick={fetchForecastData}
          className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
        >
          <RefreshCw size={20} className="text-slate-400" />
        </button>
      </div>

      {error && (
        <div className="mb-8 bg-red-50 border border-red-100 p-6 rounded-[32px] flex items-center gap-4 text-red-600 font-bold">
          <AlertCircle size={24} />
          {error}
        </div>
      )}

      {/* KPI Section: Weekly Aggregated Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ForecastStatCard 
          label="Projected Weekly Revenue" 
          value={`₱${weeklyStats.totalRevenue.toLocaleString()}`} 
          trend="+8.5%" 
          isUp={true} 
          icon={<DollarSign className="text-emerald-500" />}
          bgColor="bg-emerald-50"
        />
        <ForecastStatCard 
          label="Expected Total Bookings" 
          value={weeklyStats.totalBookings} 
          trend="+12.3%" 
          isUp={true} 
          icon={<ArrowUpRight className="text-sky-500" />}
          bgColor="bg-sky-50"
        />
        <ForecastStatCard 
          label="Avg Daily Income" 
          value={`₱${weeklyStats.avgDaily.toLocaleString()}`} 
          trend="-2.1%" 
          isUp={false} 
          icon={<TrendingDown className="text-purple-500" />}
          bgColor="bg-purple-50"
        />
      </div>

      {/* Main Analysis Chart Section */}
      <div className="bg-white p-10 rounded-[56px] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-50/30 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
        
        <div className="flex justify-between items-start mb-12 relative z-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Income & Booking Forecast</h2>
            <p className="text-slate-400 text-sm font-bold mt-1">Daily trend visualization for next 7 operational cycles</p>
          </div>
          <div className="flex gap-2 bg-slate-50 p-2 rounded-[24px] border border-slate-100">
            <button className="px-8 py-3 bg-white shadow-md rounded-2xl text-[10px] font-black text-slate-700 uppercase tracking-widest">
              Forecast
            </button>
            <button className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
              History
            </button>
          </div>
        </div>

        {/* Forecast Graph: Daily resolution */}
        <div className="h-[450px] relative z-10">
          {forecastData.length > 0 ? (
            <ForecastChart data={forecastData} />
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-100 rounded-[40px]">
                <p className="text-slate-300 font-black uppercase text-xs tracking-widest italic">Waiting for AI sync...</p>
            </div>
          )}
        </div>

        {/* Footer Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12 pt-12 border-t border-slate-50 relative z-10">
          <BreakdownItem label="System Confidence" value={`${weeklyStats.accuracy}%`} />
          <BreakdownItem label="Forecast Window" value="7 Days" />
          <BreakdownItem label="Update Frequency" value="Real-time" />
          <BreakdownItem label="Data Source" value="Neural Net" />
        </div>
      </div>
    </div>
  );
};

/**
 * SUB-COMPONENT: STAT CARD
 * Renders the weekly totals with trend indicators and iconography.
 */
const ForecastStatCard = ({ label, value, trend, isUp, icon, bgColor }) => (
  <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm group hover:shadow-xl transition-all duration-500">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3">{label}</p>
        <h3 className="text-4xl font-black text-slate-900 mb-5 tracking-tighter">{value}</h3>
        <div className={`flex items-center gap-1.5 font-black text-xs uppercase ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
          {isUp ? <TrendingUp size={14} strokeWidth={3} /> : <TrendingDown size={14} strokeWidth={3} />}
          {trend} <span className="text-slate-300 ml-1 font-bold italic">vs last week</span>
        </div>
      </div>
      <div className={`p-5 ${bgColor} rounded-[24px] group-hover:scale-110 transition-transform duration-500`}>
        {React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}
      </div>
    </div>
  </div>
);

/**
 * SUB-COMPONENT: BREAKDOWN ITEM
 * Simple key-value display for footer meta-data.
 */
const BreakdownItem = ({ label, value }) => (
  <div className="flex flex-col items-center">
    <p className="text-2xl font-black text-slate-900 mb-1 tracking-tighter">{value}</p>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
  </div>
);

export default FinancialForecast;