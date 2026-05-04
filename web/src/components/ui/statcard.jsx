import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, Users, Calendar } from 'lucide-react';

const StatCard = ({ title, value, trend, type, isNegative }) => {
  const icons = {
    revenue: <DollarSign className="text-blue-500" />,
    utilization: <Activity className="text-sky-500" />,
    income: <TrendingUp className="text-blue-400" />,
    bookings: <Calendar className="text-sky-400" />
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-50 relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900">{value || "---"}</h3>
        </div>
        <div className="p-3 bg-slate-50 rounded-2xl">
          {icons[type]}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <span className={`flex items-center text-xs font-bold ${isNegative ? 'text-red-500' : 'text-emerald-500'}`}>
          {isNegative ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
          {trend || "0%"}
        </span>
        <span className="text-slate-400 text-xs">vs yesterday</span>
      </div>
    </div>
  );
};

export default StatCard;