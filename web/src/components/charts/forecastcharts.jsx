import React from 'react';
import PropTypes from 'prop-types';
import {
  ComposedChart,
  Line,
  Bar,
  Area, 
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Activity } from 'lucide-react';

/**
 * CustomTooltip Component
 * High-contrast design matching the Dark Slate theme of your dashboard.
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-md bg-opacity-95">
        <p className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-2">{label}</p>
        <div className="space-y-1.5">
          <div className="flex justify-between gap-8 items-center">
            <span className="text-slate-300 text-xs font-bold">Bookings:</span>
            <span className="text-sky-400 font-black">
              {payload[0]?.value?.toLocaleString() || 0}
            </span>
          </div>
          <div className="flex justify-between gap-8 items-center">
            <span className="text-slate-300 text-xs font-bold">Projected Income:</span>
            <span className="text-emerald-400 font-black">
              ₱{payload[1]?.value?.toLocaleString() || 0}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.string,
};

/**
 * ForecastCharts Component
 * Aligned with file directory lowercase naming to avoid Vercel compilation discrepancies.
 */
const ForecastCharts = ({ data }) => {
  // Default fallback data for initial render or empty states matching real system lookups
  const chartData = data && data.length > 0 ? data : [
    { day: 'May 20', bookings: 12, income: 2500 },
    { day: 'May 21', bookings: 10, income: 2100 },
    { day: 'May 22', bookings: 15, income: 3200 },
    { day: 'May 23', bookings: 22, income: 4800 },
    { day: 'May 24', bookings: 25, income: 5500 },
    { day: 'May 25', bookings: 14, income: 2900 },
    { day: 'May 26', bookings: 24, income: 5100 },
  ];

  return (
    /* CONTAINER FIX: Explicit height prevents the -1 dimension error 
       during the initial Recharts layout calculation.
    */
    <div className="w-full h-[350px] min-h-[350px] relative overflow-hidden" style={{ minWidth: 0 }}>
      
      <ResponsiveContainer width="100%" height="100%" minHeight={300}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 10, bottom: 20, left: 10 }}
        >
          {/* SVG DEFINITIONS: Gradients for visual depth */}
          <defs>
            {/* Dark Slate Gradient for the Bar Chart */}
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E293B" stopOpacity={1} /> 
              <stop offset="100%" stopColor="#334155" stopOpacity={0.9} />
            </linearGradient>

            {/* Subtle Emerald Gradient for the Area background */}
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* GRID: Horizontal only, low contrast for focus on data */}
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="#F1F5F9" 
          />
          
          <XAxis 
            dataKey="day" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 800 }}
            dy={15}
          />
          
          <YAxis 
            yAxisId="left"
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
            width={30}
          />

          <YAxis 
            yAxisId="right" 
            orientation="right" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
            width={50}
            tickFormatter={(value) => `₱${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
          />

          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ fill: '#F1F5F9', radius: 10 }}
          />
          
          <Legend 
            verticalAlign="top" 
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ 
              paddingBottom: '20px', 
              fontSize: '10px', 
              fontWeight: '900', 
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}
          />

          {/* BAR: Booking volume representing Hardware Load */}
          <Bar 
            yAxisId="left"
            dataKey="bookings" 
            name="Bookings" 
            fill="url(#barGradient)" 
            radius={[6, 6, 0, 0]} 
            barSize={24}
          />

          {/* AREA FILL: Adds a subtle "glow" background to the Income line */}
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="income"
            stroke="none"
            fill="url(#incomeGradient)"
            connectNulls
            tooltipType="none" // Prevents double tooltip entries
          />

          {/* LINE: Vibrant Emerald Green representing Projected Revenue */}
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="income" 
            name="Income" 
            stroke="#10B981" 
            strokeWidth={3}
            dot={{ r: 5, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 7, strokeWidth: 0, fill: '#059669' }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* LOADING OVERLAY: Triggered when data is being synchronized from Render */}
      {(!data || data.length === 0) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-3xl z-10">
          <div className="bg-white px-6 py-4 shadow-xl rounded-2xl border border-slate-100 flex flex-col items-center">
             <Activity className="text-emerald-500 mb-2 animate-pulse" size={24} />
             <p className="text-slate-900 font-black text-[10px] tracking-widest uppercase">
                Synchronizing Stream...
             </p>
          </div>
        </div>
      )}
    </div>
  );
};

ForecastCharts.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      day: PropTypes.string.isRequired,
      bookings: PropTypes.number,
      income: PropTypes.number,
    })
  ),
};

export default ForecastCharts;