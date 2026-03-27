import React from 'react';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  Calendar, TrendingUp, DollarSign, Activity, 
  AlertCircle, Zap 
} from 'lucide-react';
import Sidebar from '../components/common/Sidebar';
import ForecastChart from '../components/charts/ForecastChart';
import { forecastData } from '../utils/mockData';

const Forecasting = () => {
  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Sidebar Sidebar fixed navigation */}
      <Sidebar activePage="Forecasting" />
      
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        <header className="mb-8 text-left">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Forecasting Engine</h1>
          <p className="text-slate-500 text-sm font-medium">Time series analysis for future profit projection</p>
        </header>

        {/* --- 1. TOP STAT CARDS SECTION --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 text-left">
          {/* Forecast Period */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4 text-sky-500 font-bold text-[10px] uppercase tracking-widest">
              <Calendar size={18} /> Forecast Period
            </div>
            <p className="text-2xl font-black text-slate-800 tracking-tight">14 Days</p>
          </div>
          
          {/* Total Bookings */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4 text-emerald-500 font-bold text-[10px] uppercase tracking-widest">
              <TrendingUp size={18} /> Total Bookings
            </div>
            <p className="text-2xl font-black text-slate-800 tracking-tight">127</p>
          </div>

          {/* Total Income */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4 text-purple-500 font-bold text-[10px] uppercase tracking-widest">
              <DollarSign size={18} /> Total Income
            </div>
            <p className="text-2xl font-black text-slate-800 tracking-tight">₱30,399</p>
          </div>

          {/* Avg Daily Income (Highlighted) */}
          <div className="bg-sky-500 p-6 rounded-2xl shadow-lg shadow-sky-100/70 text-white flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4 opacity-80 font-bold text-[10px] uppercase tracking-widest">
              <Activity size={18} /> Avg Daily Income
            </div>
            <p className="text-2xl font-black italic tracking-tight">₱2,171</p>
          </div>
        </div>

        {/* --- 2. MAIN GRAPHS WITH AVG LABELS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 text-left">
          {/* Expected Bookings Column */}
          <div className="space-y-4">
            <ForecastChart 
              title="Expected Bookings"
              subtext="Predicted booking volume for the next 14 days"
              data={forecastData}
              dataKey="bookings"
              color="#0ea5e9"
            />
            <div className="bg-sky-50 p-4 rounded-xl border border-sky-100/60 shadow-sm">
              <p className="text-[10px] text-sky-600 font-bold uppercase tracking-wider mb-1">Average Daily Bookings</p>
              <p className="text-xl font-black text-sky-800">9</p>
            </div>
          </div>

          {/* Expected Income Column */}
          <div className="space-y-4">
            <ForecastChart 
              title="Expected Income"
              subtext="Predicted revenue for the next 14 days"
              data={forecastData}
              dataKey="income"
              color="#10b981"
            />
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100/60 shadow-sm">
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">Average Daily Income</p>
              <p className="text-xl font-black text-emerald-800">₱2,171</p>
            </div>
          </div>
        </div>

        {/* --- 3. COMBINED ANALYSIS SECTION --- */}
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm mb-8 text-left">
          <div className="mb-8">
            <h3 className="font-bold text-slate-800 mb-1">Combined Forecast Analysis</h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Bookings vs Income correlation for strategic planning</p>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                    dataKey="name" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#94a3b8', fontWeight: 600 }}
                />
                <YAxis 
                    yAxisId="left" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#94a3b8' }}
                />
                <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#94a3b8' }}
                />
                <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }} 
                />
                <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle" 
                    wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 'bold' }} 
                />
                <Bar 
                    yAxisId="left" 
                    dataKey="bookings" 
                    fill="#0ea5e9" 
                    radius={[4, 4, 0, 0]} 
                    barSize={20} 
                    name="Bookings" 
                />
                <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
                    name="Income (₱)" 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- 4. INSIGHTS & RECOMMENDATION BANNERS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-left">
          {/* Analysis Insight */}
          <div className="bg-sky-50 p-6 rounded-2xl border border-sky-100 flex gap-4 items-start shadow-sm">
            <AlertCircle className="text-sky-500 shrink-0 mt-0.5" size={22} />
            <div>
              <h5 className="font-bold text-sky-900 text-sm mb-1 uppercase tracking-wide">Analysis Insight</h5>
              <p className="text-[12px] text-sky-700 leading-relaxed font-medium">
                The forecast predicts a <span className="font-bold text-sky-800">steady upward trend</span> sa bookings at revenue sa susunod na 14 days, na nagpapakita ng magandang growth potential para sa branch.
              </p>
            </div>
          </div>

          {/* Recommendation */}
          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex gap-4 items-start shadow-sm">
            <Zap className="text-emerald-500 shrink-0 mt-0.5" size={22} />
            <div>
              <h5 className="font-bold text-emerald-900 text-sm mb-1 uppercase tracking-wide">Recommendation</h5>
              <p className="text-[12px] text-emerald-700 leading-relaxed font-medium">
                Maghanda ng extra staff at supplies sa peak days. Maaari ring mag-launch ng <span className="font-bold text-emerald-800">targeted promos</span> tuwing mahina ang forecast para mapataas ang traffic.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Forecasting;