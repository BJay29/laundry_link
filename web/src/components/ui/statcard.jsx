import React from 'react';
import PropTypes from 'prop-types';
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
 * STATCARD COMPONENT
 * A high-density data visualization component for the LaundryLink dashboard.
 * Designed to handle real-time telemetry updates with semantic color coding.
 * 
 * @param {string} title - Label for the metric (e.g., "Daily Revenue")
 * @param {string|number} value - Main numerical data point
 * @param {string|number} trend - Percentage or status string (e.g., "+3.79%")
 * @param {string} type - Theme selector: 'revenue', 'utilization', 'income', or 'bookings'
 * @param {boolean} isNegative - Manual override for trend color (Red if true)
 */
const StatCard = ({ title, value, trend, type, isNegative }) => {
  
  /**
   * THEME & ICON DICTIONARY
   * Maps backend data categories to the UI's visual language.
   * "income" has been added to match the Financial Forecast terminology.
   */
  const config = {
    revenue: {
      icon: <DollarSign size={20} strokeWidth={2.5} />,
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      accentColor: 'emerald',
    },
    utilization: {
      icon: <Activity size={20} strokeWidth={2.5} />,
      bgColor: 'bg-sky-50',
      textColor: 'text-sky-600',
      accentColor: 'sky',
    },
    income: { // Linked to Projected/Net Profit metrics
      icon: <Zap size={20} strokeWidth={2.5} />,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      accentColor: 'amber',
    },
    bookings: {
      icon: <Calendar size={20} strokeWidth={2.5} />,
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      accentColor: 'indigo',
    }
  };

  // Fallback selector ensures component safety if backend sends unexpected types
  const theme = config[type] || config.revenue;

  /**
   * AUTOMATIC TREND EVALUATION
   * If isNegative isn't explicitly passed, we check if the trend string contains a minus sign.
   */
  const effectiveIsNegative = isNegative || (typeof trend === 'string' && trend.includes('-'));

  return (
    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 group">
      
      {/* 1. BACKGROUND AMBIANCE
          Subtle glow effect that expands on hover to indicate interactivity. */}
      <div className={`absolute -right-4 -top-4 w-28 h-28 rounded-full opacity-10 transition-transform duration-700 group-hover:scale-150 ${theme.bgColor}`} />

      {/* 2. HEADER: TITLE & THEMATIC ICON */}
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="space-y-1">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
            {title}
          </p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
            {value !== null && value !== undefined ? value : "₱0"}
          </h3>
        </div>
        
        {/* ICON CONTAINER
            Uses a 'squircle' style consistent with the premium dashboard design. */}
        <div className={`p-3.5 rounded-2xl shadow-sm transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 ${theme.bgColor} ${theme.textColor}`}>
          {theme.icon}
        </div>
      </div>
      
      {/* 3. FOOTER: TREND ANALYTICS
          Displays comparative performance vs the previous operational period. */}
      <div className="flex items-center gap-2 relative z-10">
        <div className={`flex items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black tracking-wider transition-colors duration-300 ${
          effectiveIsNegative 
            ? 'bg-rose-50 text-rose-600' 
            : 'bg-emerald-50 text-emerald-600'
        }`}>
          {effectiveIsNegative ? (
            <ArrowDownRight size={14} strokeWidth={3} />
          ) : (
            <ArrowUpRight size={14} strokeWidth={3} />
          )}
          {trend || "0%"}
        </div>
        
        <span className="text-slate-300 text-[9px] font-black uppercase tracking-widest">
          vs. Yesterday
        </span>
      </div>

      {/* 4. HOVER PROGRESS INDICATOR
          A subtle bottom border that animates in to provide visual feedback. */}
      <div className={`absolute bottom-0 left-0 h-1 transition-all duration-500 w-0 group-hover:w-full opacity-50 ${
        effectiveIsNegative ? 'bg-rose-500' : 'bg-emerald-500'
      }`} />
    </div>
  );
};

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  trend: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  type: PropTypes.oneOf(['revenue', 'utilization', 'income', 'bookings']),
  isNegative: PropTypes.boolean,
};

export default StatCard;