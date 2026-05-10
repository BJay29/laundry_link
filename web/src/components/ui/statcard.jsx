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
  Zap,
  Coins
} from 'lucide-react';

/**
 * STATCARD COMPONENT
 * A high-density data visualization component for the LaundryLink dashboard.
 * Fixed: Updated value formatting to handle currency and custom icon injections.
 */
const StatCard = ({ title, value, trend, type, isNegative, icon }) => {
  
  /**
   * THEME & ICON DICTIONARY
   * Maps data categories to the UI's visual language.
   */
  const config = {
    revenue: {
      icon: <DollarSign size={20} strokeWidth={2.5} />,
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      isCurrency: true,
    },
    utilization: {
      icon: <Activity size={20} strokeWidth={2.5} />,
      bgColor: 'bg-sky-50',
      textColor: 'text-sky-600',
      isCurrency: false,
    },
    income: { 
      icon: <Coins size={20} strokeWidth={2.5} />, // Replaced Zap with Coins for financial feel
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      isCurrency: true,
    },
    bookings: {
      icon: <Calendar size={20} strokeWidth={2.5} />,
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      isCurrency: false,
    }
  };

  // Select theme based on type prop, defaulting to revenue
  const theme = config[type] || config.revenue;

  /**
   * TREND EVALUATION
   * Checks if the trend is negative for semantic coloring (Red/Rose).
   */
  const effectiveIsNegative = isNegative || (typeof trend === 'string' && trend.includes('-'));

  /**
   * VALUE FORMATTING ENGINE
   * Detects if the value already has a currency symbol; if not, and theme isCurrency is true, it prepends ₱.
   */
  const displayValue = () => {
    if (value === null || value === undefined) {
      return theme.isCurrency ? "₱0" : "0";
    }

    // If the value is a string and already contains the Peso symbol, return as is
    if (typeof value === 'string' && value.includes('₱')) {
      return value;
    }

    // Format numbers with commas and currency symbol if required
    if (typeof value === 'number') {
      const formatted = value.toLocaleString();
      return theme.isCurrency ? `₱${formatted}` : formatted;
    }

    return value;
  };

  return (
    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 group">
      
      {/* 1. DECORATIVE BACKGROUND AMBIANCE */}
      <div className={`absolute -right-4 -top-4 w-28 h-28 rounded-full opacity-10 transition-transform duration-700 group-hover:scale-150 ${theme.bgColor}`} />

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="space-y-1">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
            {title}
          </p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
            {displayValue()}
          </h3>
        </div>
        
        {/* THEMATIC ICON CONTAINER 
            Uses injected icon prop if available, otherwise uses theme default. */}
        <div className={`p-3.5 rounded-2xl shadow-sm transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 ${theme.bgColor} ${theme.textColor}`}>
          {icon ? React.cloneElement(icon, { size: 20, strokeWidth: 2.5 }) : theme.icon}
        </div>
      </div>
      
      {/* 3. TREND INDICATOR */}
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
          {type === 'utilization' ? 'Currently' : 'vs. Yesterday'}
        </span>
      </div>

      {/* 4. ACTIVE HOVER BORDER */}
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
  isNegative: PropTypes.bool,
  icon: PropTypes.element
};

export default StatCard;