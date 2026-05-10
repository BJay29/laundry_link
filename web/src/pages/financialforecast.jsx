import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  RefreshCw, 
  AlertCircle, 
  Package, 
  Minus,
  CheckCircle2
} from 'lucide-react';
import ForecastChart from '../components/charts/forecastcharts';
import apiService from '../services/APIservices';

/**
 * FINANCIAL FORECAST COMPONENT
 * Visualizes 7-day AI projections against historical database baselines.
 * Fixed: Recharts stabilization and Comforter data mapping.
 */
const FinancialForecast = () => {
  const [forecastData, setForecastData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for AI aggregates and historical DB stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    avgDaily: 0,
    accuracy: 0,
    revenueTrend: "0%",
    trendStatus: 'equal', 
    bookingTrend: "0%",
    bookingStatus: 'equal',
    // Actual DB Totals
    fullService: 0,
    titanWash: 0,
    regularWash: 0,
    comforter: 0,
    totalKg: 0
  });

  /**
   * DATA SYNCHRONIZATION ENGINE
   * Fetches the 7-day forecast and actual historical summary.
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Concurrent fetch to prevent network waterfalls
      const [forecastRes, summaryRes] = await Promise.allSettled([
        apiService.getForecastData(),
        apiService.getDashboardStats()
      ]);

      if (forecastRes.status === 'fulfilled' && forecastRes.value?.forecast) {
        const rawForecast = forecastRes.value.forecast;
        
        // 1. Map Forecast data for the chart component
        setForecastData(rawForecast.map(item => ({
          day: item.label.split(',')[0], // Extract day name if label is "Day, Date"
          bookings: item.predicted_bookings || 0,
          income: item.projected_income || 0
        })));

        // 2. Aggregate AI Projections for KPI cards
        const totalProjectedRev = rawForecast.reduce((sum, item) => sum + (item.projected_income || 0), 0);
        const totalProjectedBook = rawForecast.reduce((sum, item) => sum + (item.predicted_bookings || 0), 0);
        
        let lastWeekActualTotalIncome = 0;
        let lastWeekActualTotalBookings = 0;
        let dbActuals = { fs: 0, tw: 0, rw: 0, cf: 0, kg: 0, acc: 0 };

        // 3. Process Historical Actuals from Summary
        if (summaryRes.status === 'fulfilled') {
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

        // 4. Trend Calculation Logic (Projected vs Historical)
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
      setError("Failed to sync records with the AI projection engine.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <RefreshCw className="animate-spin text-sky-500" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest italic text-slate-400">Analyzing Market Data...</p>
      </div>
    </div>
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      {/* HEADER SECTION */}
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Financial Forecast</h1>
          <p className="text-slate-500 font-bold text-sm">Aggregated projections analyzed against historical records</p>
        </div>
        <button onClick={fetchData} className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm active:scale-95">
          <RefreshCw size={20} className="text-slate-400" />
        </button>
      </div>

      {error && (
        <div className="mb-8 bg-red-50 border border-red-100 p-6 rounded-[32px] flex items-center gap-4 text-red-600 font-bold">
          <AlertCircle size={24} />
          {error}
        </div>
      )}

      {/* KPI GRID */}
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
          label="Estimated Total Bookings" 
          value={stats.totalBookings} 
          trend={stats.bookingTrend} 
          status={stats.bookingStatus} 
          icon={<Package className="text-sky-500" />}
          bgColor="bg-sky-50"
        />
        <ForecastStatCard 
          label="Avg. Daily Revenue" 
          value={`₱${stats.avgDaily.toLocaleString()}`} 
          trend={stats.revenueTrend} 
          status={stats.trendStatus} 
          icon={<TrendingUp className="text-purple-500" />}
          bgColor="bg-purple-50"
        />
      </div>

      {/* CHART & BREAKDOWN CONTAINER */}
      <div className="bg-white p-10 rounded-[56px] border border-slate-100 shadow-sm relative">
        <div className="mb-12 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Income & Booking Forecast</h2>
            <p className="text-slate-400 text-sm font-bold mt-1 italic">Daily neural-network projections for the next 7 days</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider"> {stats.accuracy}%</span>
          </div>
        </div>

        {/* CHART AREA - Fixed with explicit height and minWidth control */}
        <div className="h-[450px] w-full" style={{ minWidth: 0 }}>
          {forecastData.length > 0 ? (
            <ForecastChart data={forecastData} />
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-100 rounded-[40px]">
                <p className="text-slate-300 font-black uppercase text-xs tracking-widest">Awaiting Neural Stream...</p>
            </div>
          )}
        </div>

        {/* REPAIRED FOOTER BREAKDOWN */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mt-12 pt-12 border-t border-slate-50">
          <BreakdownItem label="Full Service" value={stats.fullService} sub="Actual Orders" />
          <BreakdownItem label="Titan Wash" value={stats.titanWash} sub="Actual Orders" />
          <BreakdownItem label="Regular Wash" value={stats.regularWash} sub="Actual Orders" />
          <BreakdownItem label="Comforter" value={stats.comforter} sub="Actual Orders" />
          <BreakdownItem label="Total Weight" value={`${stats.totalKg}kg`} sub="Recorded Weight" />
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
    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm group hover:shadow-xl transition-all duration-500">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3">{label}</p>
          <h3 className="text-4xl font-black text-slate-900 mb-5 tracking-tighter">{value}</h3>
          <div className={`flex items-center gap-1.5 font-black text-xs uppercase ${color}`}>
            <Icon size={14} strokeWidth={3} />
            {trend} <span className="text-slate-300 ml-1 font-bold italic lowercase">vs last week</span>
          </div>
        </div>
        <div className={`p-5 ${bgColor} rounded-[24px] group-hover:scale-110 transition-transform`}>
          {React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}
        </div>
      </div>
    </div>
  );
};

/**
 * Breakdown Item Sub-component
 */
const BreakdownItem = ({ label, value, sub }) => (
  <div className="flex flex-col items-center text-center">
    <p className="text-2xl font-black text-slate-900 mb-1 tracking-tighter">{value}</p>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
    <p className="text-[8px] text-slate-300 font-bold uppercase mt-1 italic">{sub}</p>
  </div>
);

export default FinancialForecast;