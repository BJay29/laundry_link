import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  RefreshCw, 
  AlertCircle, 
  Package, 
  Minus,
  Zap
} from 'lucide-react';
import ForecastChart from '../components/charts/forecastcharts';
import apiService from '../services/APIservices';

/**
 * FINANCIAL FORECAST COMPONENT
 * Visualizes 7-day AI projections against historical database baselines.
 * Optimized for high-density telemetry display and container stability.
 */
const FinancialForecast = () => {
  const [forecastData, setForecastData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for AI-generated aggregates and historical database baselines
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    avgDaily: 0,
    accuracy: 0,
    revenueTrend: "0%",
    trendStatus: 'equal', 
    bookingTrend: "0%",
    bookingStatus: 'equal',
    fullService: 0,
    titanWash: 0,
    regularWash: 0,
    comforter: 0,
    totalKg: 0
  });

  /**
   * DATA SYNCHRONIZATION ENGINE
   * Fetches the 7-day forecast and historical summary concurrently.
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Concurrent execution to prevent network waterfall delays
      const [forecastRes, summaryRes] = await Promise.allSettled([
        apiService.getForecastData(),
        apiService.getDashboardStats()
      ]);

      if (forecastRes.status === 'fulfilled' && forecastRes.value?.forecast) {
        const rawForecast = forecastRes.value.forecast;
        
        // Map data for the Recharts ComposedChart component
        setForecastData(rawForecast.map(item => ({
          day: item.label.split(',')[0], 
          bookings: item.predicted_bookings || 0,
          income: item.projected_income || 0
        })));

        // Calculate AI Projection Aggregates
        const totalProjectedRev = rawForecast.reduce((sum, item) => sum + (item.projected_income || 0), 0);
        const totalProjectedBook = rawForecast.reduce((sum, item) => sum + (item.predicted_bookings || 0), 0);
        
        let lastWeekActualTotalIncome = 0;
        let lastWeekActualTotalBookings = 0;
        let dbActuals = { fs: 0, tw: 0, rw: 0, cf: 0, kg: 0, acc: 0 };

        // Process Historical Data from Database
        if (summaryRes.status === 'fulfilled' && summaryRes.value) {
          const data = summaryRes.value;
          
          if (data.history && Array.isArray(data.history)) {
            lastWeekActualTotalIncome = data.history.reduce((sum, day) => sum + (day.actual_income || 0), 0);
            lastWeekActualTotalBookings = data.history.reduce((sum, day) => sum + (day.actual_bookings || 0), 0);
          }

          dbActuals = {
            fs: data.full_service || 0,
            tw: data.titan_wash || 0,
            rw: data.regular_wash || 0,
            cf: data.comforter || 0,
            kg: data.total_kg || 0,
            acc: data.accuracy_rate || 0
          };
        }

        // Logic to compare Forecasted vs. Historical performance
        const calculateTrend = (projected, historical) => {
          if (historical === 0) return { percent: "0%", status: 'equal' };
          const diff = projected - historical;
          const percent = (diff / historical) * 100;
          let status = 'equal';
          if (percent > 0.5) status = 'up';
          else if (percent < -0.5) status = 'down';
          return { percent: `${Math.abs(percent).toFixed(1)}%`, status };
        };

        const revTrend = calculateTrend(totalProjectedRev, lastWeekActualTotalIncome);
        const bookTrend = calculateTrend(totalProjectedBook, lastWeekActualTotalBookings);

        setStats({
          totalRevenue: totalProjectedRev,
          totalBookings: totalProjectedBook,
          avgDaily: Math.round(totalProjectedRev / 7),
          accuracy: dbActuals.acc,
          revenueTrend: revTrend.percent,
          trendStatus: revTrend.status,
          bookingTrend: bookTrend.percent,
          bookingStatus: bookTrend.status,
          fullService: dbActuals.fs,
          titanWash: dbActuals.tw,
          regularWash: dbActuals.rw,
          comforter: dbActuals.cf,
          totalKg: dbActuals.kg
        });
      }
    } catch (err) {
      console.error("Financial Sync Failure:", err);
      setError("Critical Handshake Error: Failed to synchronize with AI Prediction Node.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Loading State with Spinner
  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <RefreshCw className="animate-spin text-sky-500" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Syncing Projections...</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-sans">
      
      {/* HEADER SECTION */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic">Financial Forecast</h1>
          <p className="text-slate-500 font-bold text-sm">Automated projections analyzed against cross-referenced historical data.</p>
        </div>
        <button onClick={fetchData} className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all shadow-sm active:scale-95">
          <RefreshCw size={20} className="text-slate-400" />
        </button>
      </div>

      {error && (
        <div className="mb-8 bg-rose-50 border border-rose-100 p-6 rounded-[32px] flex items-center gap-4 text-rose-600 font-bold">
          <AlertCircle size={24} />
          {error}
        </div>
      )}

      {/* STRATEGIC KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ForecastStatCard 
          label="Projected Weekly Revenue" 
          value={`₱${stats.totalRevenue.toLocaleString()}`} 
          trend={stats.revenueTrend} 
          status={stats.trendStatus} 
          icon={<DollarSign className="text-emerald-500" />}
          bgColor="bg-emerald-50"
        />
        <ForecastStatCard 
          label="Expected Booking Volume" 
          value={stats.totalBookings} 
          trend={stats.bookingTrend} 
          status={stats.bookingStatus} 
          icon={<Package className="text-sky-500" />}
          bgColor="bg-sky-50"
        />
        <ForecastStatCard 
          label="Average Daily Target" 
          value={`₱${stats.avgDaily.toLocaleString()}`} 
          trend={stats.revenueTrend} 
          status={stats.trendStatus} 
          icon={<TrendingUp className="text-purple-500" />}
          bgColor="bg-purple-50"
        />
      </div>

      {/* MAIN ANALYTICS CONTAINER */}
      <div className="bg-white p-6 md:p-10 rounded-[40px] md:rounded-[56px] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col">
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <Zap size={18} className="text-sky-500 fill-sky-500" />
               <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Performance Prediction</h2>
            </div>
            <p className="text-slate-400 text-sm font-bold italic">7-day outlook based on current machine utilization and booking trends.</p>
          </div>
        </div>

        {/* CHART AREA - Fixed Height for Recharts Stability */}
        <div className="h-[350px] md:h-[450px] w-full relative mb-6" style={{ minWidth: '0' }}>
          {forecastData.length > 0 ? (
            <ForecastChart data={forecastData} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[40px]">
                <RefreshCw className="text-slate-200 mb-4 animate-spin" size={40} />
                <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest">Awaiting Telemetry Stream...</p>
            </div>
          )}
        </div>

        {/* HISTORICAL SERVICE DISTRIBUTION FOOTER */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mt-auto pt-10 border-t border-slate-50">
          <BreakdownItem label="Full Service" value={stats.fullService} />
          <BreakdownItem label="Titan Wash" value={stats.titanWash} />
          <BreakdownItem label="Regular Wash" value={stats.regularWash} />
          <BreakdownItem label="Comforter" value={stats.comforter} />
          <BreakdownItem label="Total Load" value={`${stats.totalKg}kg`} />
        </div>
      </div>
    </div>
  );
};

/**
 * KPI Card Sub-component
 */
const ForecastStatCard = ({ label, value, trend, status, icon, bgColor }) => {
  const getTrendStyles = () => {
    switch (status) {
      case 'up': return { color: 'text-emerald-500', Icon: TrendingUp };
      case 'down': return { color: 'text-rose-500', Icon: TrendingDown };
      default: return { color: 'text-slate-400', Icon: Minus };
    }
  };

  const { color, Icon } = getTrendStyles();

  return (
    <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-sm group hover:shadow-md transition-all">
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 truncate">{label}</p>
          <h3 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tighter truncate">{value}</h3>
          <div className={`flex items-center gap-1.5 font-black text-[10px] uppercase ${color}`}>
            <Icon size={12} strokeWidth={4} />
            {trend} <span className="text-slate-300 ml-1 font-bold italic lowercase tracking-normal">vs. Last Week</span>
          </div>
        </div>
        <div className={`p-4 ${bgColor} rounded-2xl group-hover:rotate-6 transition-transform shrink-0`}>
          {React.cloneElement(icon, { size: 22, strokeWidth: 2.5 })}
        </div>
      </div>
    </div>
  );
};

/**
 * Breakdown Item Sub-component
 */
const BreakdownItem = ({ label, value }) => (
  <div className="flex flex-col items-center text-center">
    <p className="text-xl md:text-2xl font-black text-slate-900 mb-0.5 tracking-tighter">{value}</p>
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
  </div>
);

export default FinancialForecast;