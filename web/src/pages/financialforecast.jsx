import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  RefreshCw, 
  AlertCircle, 
  Package, 
  Minus,
  Zap,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import ForecastCharts from '../components/charts/forecastcharts';
import LoadingScreen from '../components/ui/loadingscreen';
import apiService from '../services/APIservices';

/**
 * TYPEWRITER COMPONENT
 * Handles the character-by-character typing animation for AI insights.
 */
const Typewriter = ({ text, speed = 20 }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let i = 0;
    setDisplayedText("");
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return <span className="text-slate-600 font-semibold">{displayedText}</span>;
};

/**
 * FINANCIAL FORECAST COMPONENT
 * Visualizes 7-day AI projections against historical database baselines.
 *
 * UPDATED (accuracy hidden): inalis na sa UI ang "AI Calibration
 * Parameters" section (Confidence Index at Model Fit) — hindi dapat
 * ipakita sa system ang accuracy ng AI prediction.
 *
 * UPDATED (uniform loading screen): gumagamit na ng shared
 * <LoadingScreen />.
 */
const FinancialForecast = () => {
  const [forecastData, setForecastData] = useState([]);
  const [modelTier, setModelTier] = useState(null);
  const [aiInsight, setAiInsight] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    avgDaily: 0,
    revenueTrend: "0%",
    trendStatus: 'equal', 
    bookingTrend: "0%",
    bookingStatus: 'equal',
  });

  /**
   * DATA SYNCHRONIZATION ENGINE
   */
  const fetchData = useCallback(async () => {
    try {
      const [forecastRes, summaryRes] = await Promise.allSettled([
        apiService.getForecastData(),
        apiService.getDashboardStats()
      ]);

      if (forecastRes.status === 'fulfilled' && forecastRes.value?.forecast) {
        const rawForecast = forecastRes.value.forecast;
        setAiInsight(forecastRes.value.ai_generated_insight || "No active insights generated.");

        setForecastData(rawForecast.map(item => ({
          day: item.label.split(',')[0], 
          bookings: item.predicted_bookings ?? 0,
          income: item.projected_income ?? 0,
          rain_mm: item.rain_mm ?? 0,
        })));
        setModelTier(rawForecast[0]?.model_tier || null);

        const totalProjectedRev = rawForecast.reduce((sum, item) => sum + (item.projected_income || 0), 0);
        const totalProjectedBook = rawForecast.reduce((sum, item) => sum + (item.predicted_bookings || 0), 0);
        
        let lastWeekIncome = 0;
        let lastWeekBookings = 0;

        if (summaryRes.status === 'fulfilled' && summaryRes.value) {
          const data = summaryRes.value;
          lastWeekIncome = data.last_week_revenue || 0;
          lastWeekBookings = data.last_week_bookings || 0;
        }

        const calculateTrend = (projected, historical) => {
          if (historical === 0) return { percent: "0%", status: 'equal' };
          const diff = projected - historical;
          const percent = (diff / historical) * 100;
          let status = 'equal';
          if (percent > 0.5) status = 'up';
          else if (percent < -0.5) status = 'down';
          return { percent: `${Math.abs(percent).toFixed(1)}%`, status };
        };

        const revTrend = calculateTrend(totalProjectedRev, lastWeekIncome);
        const bookTrend = calculateTrend(totalProjectedBook, lastWeekBookings);

        setStats({
          totalRevenue: totalProjectedRev,
          totalBookings: totalProjectedBook,
          avgDaily: Math.round(totalProjectedRev / 7),
          revenueTrend: revTrend.percent,
          trendStatus: revTrend.status,
          bookingTrend: bookTrend.percent,
          bookingStatus: bookTrend.status,
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
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) return <LoadingScreen message="Syncing Projections..." />;

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-sans">

      {/* PAGE HEADER */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic">Business Forecast</h1>
          <p className="text-slate-500 font-bold text-sm">Automated projections analyzed against cross-referenced historical data.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 px-4 py-4 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm border border-emerald-100">
            <CheckCircle2 size={20} />
            <span className="font-bold text-sm">System Automated</span>
          </div>
          <button
            onClick={fetchData}
            className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all shadow-sm active:scale-95"
          >
            <RefreshCw size={20} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="mb-8 bg-rose-50 border border-rose-100 p-6 rounded-[32px] flex items-center gap-4 text-rose-600 font-bold">
          <AlertCircle size={24} />
          {error}
        </div>
      )}

      {/* AI EXECUTIVE INSIGHT */}
      {aiInsight && (
        <div className="mb-8 bg-white border border-indigo-100 p-6 rounded-[32px] flex items-start gap-4 shadow-sm">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Sparkles size={20} />
          </div>
          <div>
            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">AI Executive Insight</h4>
            <Typewriter text={aiInsight} />
          </div>
        </div>
      )}

      {/* KPI STAT CARDS */}
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

      {/* MAIN CHART SECTION */}
      <div className="bg-white p-6 md:p-10 rounded-[40px] md:rounded-[56px] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col mb-8">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={18} className="text-sky-500 fill-sky-500" />
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">
                Forecast &amp; Weather Outlook
              </h2>
            </div>
            <p className="text-slate-400 text-sm font-bold italic">
              Next 7-days prediction of bookings and income, adjusted for weather
            </p>
          </div>
        </div>

        <div className="w-full relative">
          {forecastData.length > 0 ? (
            <ForecastCharts data={forecastData} modelTier={modelTier} />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-100 rounded-[40px]">
              <RefreshCw className="text-slate-200 mb-4 animate-spin" size={40} />
              <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest">
                Awaiting Telemetry Stream...
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

const ForecastStatCard = ({ label, value, trend, status, icon, bgColor }) => {
  const getTrendStyles = () => {
    switch (status) {
      case 'up':   return { color: 'text-emerald-500', Icon: TrendingUp };
      case 'down': return { color: 'text-rose-500',    Icon: TrendingDown };
      default:     return { color: 'text-slate-400',   Icon: Minus };
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
            {trend}
            <span className="text-slate-300 ml-1 font-bold italic lowercase tracking-normal">vs. Last Week</span>
          </div>
        </div>
        <div className={`p-4 ${bgColor} rounded-2xl group-hover:rotate-6 transition-transform shrink-0`}>
          {React.cloneElement(icon, { size: 22, strokeWidth: 2.5 })}
        </div>
      </div>
    </div>
  );
};

export default FinancialForecast;