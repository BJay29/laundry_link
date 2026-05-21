import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

/**
 * TREND INDICATOR
 * Displays an arrow icon based on consumption trend.
 * - Up (Red): Consumption is increasing (item is being used faster).
 * - Down (Green): Consumption is decreasing (usage is slowing down).
 * - Neutral (Gray): No significant change.
 */
const TrendIndicator = ({ trend }) => {
  // trend: 'up', 'down', or 'neutral'
  
  const getTrendStyles = () => {
    switch (trend) {
      case 'up':
        return {
          icon: <ArrowUpRight size={14} />,
          color: 'text-red-600',
          bg: 'bg-red-50',
          label: 'Increased Usage'
        };
      case 'down':
        return {
          icon: <ArrowDownRight size={14} />,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
          label: 'Decreased Usage'
        };
      default:
        return {
          icon: <Minus size={14} />,
          color: 'text-slate-500',
          bg: 'bg-slate-50',
          label: 'Stable'
        };
    }
  };

  const style = getTrendStyles();

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full w-fit ${style.bg}`}>
      <span className={style.color}>
        {style.icon}
      </span>
      <span className={`text-[10px] font-bold ${style.color}`}>
        {style.label}
      </span>
    </div>
  );
};

export default TrendIndicator;