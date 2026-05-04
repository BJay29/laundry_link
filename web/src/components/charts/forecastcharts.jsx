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
} from 'recharts';

/**
 * CustomTooltip Component
 * Styled to match the premium dark look from the reference wireframes.
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-md bg-opacity-95">
        <p className="font-black text-xs uppercase tracking-widest text-slate-400 mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-8 items-center">
            <span className="text-slate-300 text-sm font-bold">Bookings:</span>
            <span className="text-sky-400 font-black">{payload[0].value}</span>
          </div>
          <div className="flex justify-between gap-8 items-center">
            <span className="text-slate-300 text-sm font-bold">Income:</span>
            <span className="text-emerald-400 font-black">₱{payload[1].value.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const ForecastChart = ({ data }) => {
  // Default data if none is provided to prevent chart breaking during dev
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
    <div className="w-full h-[400px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 10, bottom: 0, left: 10 }}
        >
          {/* Grid setup matching image_5bca61.png */}
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="#F1F5F9" 
          />
          
          <XAxis 
            dataKey="day" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 700 }}
            dy={15}
          />
          
          {/* Primary Axis for Bookings */}
          <YAxis 
            yAxisId="left"
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 500 }}
            width={40}
          />

          {/* Secondary Axis for Revenue */}
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 500 }}
            width={60}
          />

          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ fill: '#F8FAFC' }}
          />
          
          <Legend 
            verticalAlign="bottom" 
            align="center"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingTop: '40px', fontSize: '12px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          />

          {/* Bar Component for Predicted Bookings */}
          <Bar 
            yAxisId="left"
            dataKey="bookings" 
            name="Predicted Bookings" 
            fill="#0EA5E9" 
            radius={[6, 6, 0, 0]} 
            barSize={45}
            animationDuration={1500}
          />

          {/* Line Component for Projected Income */}
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="income" 
            name="Projected Income" 
            stroke="#10B981" 
            strokeWidth={4}
            dot={{ r: 5, fill: '#10B981', strokeWidth: 3, stroke: '#fff' }}
            activeDot={{ r: 8, strokeWidth: 0 }}
            animationDuration={2000}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Conditional Empty State Overlay */}
      {(!data || data.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-2xl">
          <p className="text-slate-400 font-bold text-sm tracking-widest uppercase bg-white px-6 py-3 shadow-xl rounded-full border border-slate-100">
            No forecast data available
          </p>
        </div>
      )}
    </div>
  );
};

// PropTypes for better development documentation
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