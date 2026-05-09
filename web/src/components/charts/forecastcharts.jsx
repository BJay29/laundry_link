import React from 'react';
import PropTypes from 'prop-types';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

/**
 * CustomTooltip Component
 * Optimized for high-contrast visibility and currency formatting.
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

/**
 * ForecastChart
 * Visualizes the 7-day AI demand projection.
 * Uses a ComposedChart to overlay Projected Income (Line) over Bookings (Bar).
 */
const ForecastChart = ({ data }) => {
  // Placeholder data to maintain layout structure if API is fetching or empty
  const chartData = data && data.length > 0 ? data : [
    { day: 'Mon', bookings: 0, income: 0 },
    { day: 'Tue', bookings: 0, income: 0 },
    { day: 'Wed', bookings: 0, income: 0 },
    { day: 'Thu', bookings: 0, income: 0 },
    { day: 'Fri', bookings: 0, income: 0 },
    { day: 'Sat', bookings: 0, income: 0 },
    { day: 'Sun', bookings: 0, income: 0 },
  ];

  return (
    <div className="w-full h-full min-h-[350px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 0, bottom: 20, left: 0 }}
        >
          {/* Definition for Bar Gradient */}
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0EA5E9" stopOpacity={1} />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.8} />
            </linearGradient>
          </defs>

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
            // Ensure labels don't collide on small screens
            interval={0} 
          />
          
          {/* Left Axis: Volumetric Data (Bookings) */}
          <YAxis 
            yAxisId="left"
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
            width={35}
          />

          {/* Right Axis: Financial Data (Income) */}
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
            width={55}
            tickFormatter={(value) => `₱${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
          />

          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ fill: '#F8FAFC', radius: 10 }}
          />
          
          <Legend 
            verticalAlign="top" 
            align="right"
            iconType="circle"
            iconSize={6}
            wrapperStyle={{ 
              paddingBottom: '30px', 
              fontSize: '10px', 
              fontWeight: '900', 
              color: '#64748B', 
              textTransform: 'uppercase', 
              letterSpacing: '0.1em' 
            }}
          />

          {/* BAR: PREDICTED VOLUME */}
          <Bar 
            yAxisId="left"
            dataKey="bookings" 
            name="Bookings" 
            fill="url(#barGradient)" 
            radius={[8, 8, 0, 0]} 
            barSize={32}
            animationDuration={1200}
            animationEasing="ease-out"
          />

          {/* LINE: PROJECTED REVENUE */}
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="income" 
            name="Income" 
            stroke="#10B981" 
            strokeWidth={4}
            dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, strokeWidth: 0, fill: '#059669' }}
            animationDuration={1800}
            animationEasing="ease-in-out"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* BLUR OVERLAY: Triggers if backend returns an empty array during cooldowns */}
      {(!data || data.length === 0) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[1.5px] rounded-3xl">
          <div className="bg-white/90 px-6 py-4 shadow-2xl shadow-slate-200/50 rounded-[24px] border border-slate-100 flex flex-col items-center">
             <Activity className="text-sky-400 mb-2 animate-pulse" size={20} />
             <p className="text-slate-900 font-black text-[10px] tracking-[0.2em] uppercase">
               Syncing Forecast...
             </p>
          </div>
        </div>
      )}
    </div>
  );
};

ForecastChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      day: PropTypes.string.isRequired,
      bookings: PropTypes.number,
      income: PropTypes.number,
    })
  ),
};

export default ForecastChart;