import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, ArrowUpRight } from 'lucide-react';
import ForecastChart from '../components/charts/forecastcharts';

const FinancialForecast = () => {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-900">Financial Forecast</h1>
        <p className="text-slate-500 font-bold">7-day income and booking predictions</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ForecastStatCard 
          label="Projected Weekly Revenue" 
          value="₱44,450" 
          trend="+8.5%" 
          isUp={true} 
          icon={<DollarSign className="text-emerald-500" />}
          bgColor="bg-emerald-50"
        />
        <ForecastStatCard 
          label="Expected Total Bookings" 
          value="378" 
          trend="+12.3%" 
          isUp={true} 
          icon={<ArrowUpRight className="text-sky-500" />}
          bgColor="bg-sky-50"
        />
        <ForecastStatCard 
          label="Avg Daily Income" 
          value="₱6,350" 
          trend="-2.1%" 
          isUp={false} 
          icon={<TrendingDown className="text-purple-500" />}
          bgColor="bg-purple-50"
        />
      </div>

      {/* Main Chart Section */}
      <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Income & Booking Forecast</h2>
            <p className="text-slate-400 text-sm font-bold mt-1">Next 7 days prediction with service breakdown</p>
          </div>
          <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            <button className="px-6 py-2 bg-white shadow-sm rounded-xl text-xs font-black text-slate-700">Historical Trends</button>
            <button className="px-6 py-2 text-xs font-black text-slate-400">Real-time Capacity</button>
          </div>
        </div>

        <ForecastChart />

        {/* Breakdown Footer */}
        <div className="grid grid-cols-4 gap-8 mt-12 pt-12 border-t border-slate-50">
          <BreakdownItem label="Wash Only" value="164" />
          <BreakdownItem label="Dry Only" value="128" />
          <BreakdownItem label="Full Service" value="86" />
          <BreakdownItem label="Total Weight" value="2345 kg" />
        </div>
      </div>
    </div>
  );
};

const ForecastStatCard = ({ label, value, trend, isUp, icon, bgColor }) => (
  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">{label}</p>
        <h3 className="text-4xl font-black text-slate-900 mb-4">{value}</h3>
        <div className={`flex items-center gap-1 font-black text-sm ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
          {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          {trend} <span className="text-slate-300 ml-1">vs last week</span>
        </div>
      </div>
      <div className={`p-4 ${bgColor} rounded-2xl`}>{icon}</div>
    </div>
  </div>
);

const BreakdownItem = ({ label, value }) => (
  <div className="text-center">
    <p className="text-3xl font-black text-slate-900 mb-1">{value}</p>
    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</p>
  </div>
);

export default FinancialForecast;