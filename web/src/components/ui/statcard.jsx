import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  Zap
} from 'lucide-react';

/**
 * StatCard Component
 * Central dashboard component for visualizing high-level KPIs and business health.
 * 
 * @param {string} title - The display name of the metric (e.g., "Daily Revenue")
 * @param {string|number} value - The primary data point, typically formatted as currency or percentage
 * @param {string} trend - The comparative change value (e.g., "+12%")
 * @param {string} type - Determines the theme: revenue, utilization, overhead, bookings
 * @param {boolean} isNegative - Controls the semantic color of the trend indicator
 */
const StatCard = ({ title, value, trend, type, isNegative }) => {
  
  /**
   * ICON & THEME CONFIGURATION
   * Maps specific business domains to distinct visual identifiers.
   */
  const config = {
    revenue: {
      icon: <DollarSign size={20} />,
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
    },
    utilization: {
      icon: <Activity size={20} />,
      bgColor: 'bg-sky-50',
      textColor: 'text-sky-600',
    },
    overhead: { // Focused on Electricity, Water, and Supply costs
      icon: <Zap size={20} />,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
    bookings: {
      icon: <Calendar size={20} />,
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
    }
  };

  // Fallback to revenue theme if an unknown type is passed
  const theme = config[type] || config.revenue;

  return (
    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden transition-all hover:shadow-md group">
      
      {/* 1. DECORATIVE ELEMENT: Subtle background glow for visual depth */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-125 duration-500 ${theme.bgColor}`} />

      {/* 2. PRIMARY DATA SECTION */}
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div>
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mb-1">
            {title}
          </p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
            {value || "₱0.00"}
          </h3>
        </div>
        
        {/* Thematic Icon Container */}
        <div className={`p-3.5 rounded-2xl shadow-sm transition-transform group-hover:-translate-y-1 duration-300 ${theme.bgColor} ${theme.textColor}`}>
          {theme.icon}
        </div>
      </div>
      
      {/* 3. TREND ANALYTICS SECTION */}
      <div className="flex items-center gap-2 relative z-10">
        <div className={`flex items-center gap-0.5 px-2.5 py-1 rounded-lg text-[11px] font-black tracking-tight ${
          isNegative 
            ? 'bg-rose-50 text-rose-600' 
            : 'bg-emerald-50 text-emerald-600'
        }`}>
          {isNegative ? (
            <ArrowDownRight size={14} strokeWidth={3} />
          ) : (
            <ArrowUpRight size={14} strokeWidth={3} />
          )}
          {trend || "0%"}
        </div>
        
        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-tight">
          Since last period
        </span>
      </div>
    </div>
  );
};

export default StatCard;