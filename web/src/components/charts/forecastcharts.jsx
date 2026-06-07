import React from 'react';
import PropTypes from 'prop-types';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Activity, TrendingUp, BarChart2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM TOOLTIP: Bookings Bar Chart
// ─────────────────────────────────────────────────────────────────────────────
const BookingsTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md">
        <p className="font-black text-[9px] uppercase tracking-[0.2em] text-slate-400 mb-2">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sky-400" />
          <span className="text-slate-300 text-xs font-bold">Bookings:</span>
          <span className="text-sky-300 font-black text-sm ml-1">
            {payload[0]?.value?.toLocaleString() || 0}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM TOOLTIP: Income Area/Line Chart
// ─────────────────────────────────────────────────────────────────────────────
const IncomeTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md">
        <p className="font-black text-[9px] uppercase tracking-[0.2em] text-slate-400 mb-2">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-slate-300 text-xs font-bold">Projected Income:</span>
          <span className="text-emerald-300 font-black text-sm ml-1">
            ₱{payload[0]?.value?.toLocaleString() || 0}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM BAR SHAPE: Rounded top corners with a subtle inner glow effect
// ─────────────────────────────────────────────────────────────────────────────
const RoundedBar = (props) => {
  const { x, y, width, height, fill } = props;
  const radius = 8;
  if (!height || height <= 0) return null;
  return (
    <g>
      {/* Bar shadow/glow layer */}
      <rect
        x={x + 2}
        y={y + 4}
        width={width - 4}
        height={height}
        rx={radius}
        ry={radius}
        fill="#0EA5E9"
        opacity={0.12}
      />
      {/* Main bar */}
      <path
        d={`
          M ${x + radius},${y}
          L ${x + width - radius},${y}
          Q ${x + width},${y} ${x + width},${y + radius}
          L ${x + width},${y + height}
          L ${x},${y + height}
          L ${x},${y + radius}
          Q ${x},${y} ${x + radius},${y}
          Z
        `}
        fill={fill}
      />
    </g>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM DOT: Income line chart dot with a white ring
// ─────────────────────────────────────────────────────────────────────────────
const CustomDot = (props) => {
  const { cx, cy, value } = props;
  if (!value) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="#10B981" opacity={0.2} />
      <circle cx={cx} cy={cy} r={4} fill="#10B981" stroke="#fff" strokeWidth={2} />
    </g>
  );
};

const CustomActiveDot = (props) => {
  const { cx, cy } = props;
  return (
    <g>
      <circle cx={cx} cy={cy} r={10} fill="#10B981" opacity={0.15} />
      <circle cx={cx} cy={cy} r={6} fill="#10B981" stroke="#fff" strokeWidth={2.5} />
    </g>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FORECAST CHARTS COMPONENT
// Two fully separated charts: Bookings (bar) and Projected Income (area + line)
// ─────────────────────────────────────────────────────────────────────────────
const ForecastCharts = ({ data }) => {
  const chartData = data && data.length > 0 ? data : [
    { day: 'May 20', bookings: 12, income: 2500 },
    { day: 'May 21', bookings: 10, income: 2100 },
    { day: 'May 22', bookings: 15, income: 3200 },
    { day: 'May 23', bookings: 22, income: 4800 },
    { day: 'May 24', bookings: 25, income: 5500 },
    { day: 'May 25', bookings: 14, income: 2900 },
    { day: 'May 26', bookings: 24, income: 5100 },
  ];

  // Calculate average lines for reference
  const avgBookings = Math.round(
    chartData.reduce((s, d) => s + (d.bookings || 0), 0) / chartData.length
  );
  const avgIncome = Math.round(
    chartData.reduce((s, d) => s + (d.income || 0), 0) / chartData.length
  );

  const maxBookings = Math.max(...chartData.map(d => d.bookings || 0));
  const maxIncome = Math.max(...chartData.map(d => d.income || 0));

  return (
    <div className="w-full flex flex-col gap-6">

      {/* ── CHART 1: TOTAL BOOKINGS (BAR CHART) ── */}
      <div className="w-full rounded-[28px] overflow-hidden border border-slate-100 bg-white shadow-sm">
        {/* Chart Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-50 rounded-xl">
              <BarChart2 size={15} className="text-sky-500" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">7-Day Projection</p>
              <h3 className="text-sm font-black text-slate-800 tracking-tight leading-tight">Total Bookings</h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Peak</p>
              <p className="text-sm font-black text-sky-600">{maxBookings} orders</p>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avg / Day</p>
              <p className="text-sm font-black text-slate-700">{avgBookings}</p>
            </div>
          </div>
        </div>

        {/* Bookings Bar Chart with sky-blue gradient background */}
        <div
          className="px-4 pt-4 pb-2"
          style={{
            background: 'linear-gradient(180deg, #F0F9FF 0%, #ffffff 100%)',
          }}
        >
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 8, bottom: 0, left: -10 }}
                barCategoryGap="30%"
              >
                <defs>
                  {/* Sky blue gradient for bars */}
                  <linearGradient id="bookingsBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity={1} />
                    <stop offset="100%" stopColor="#0284C7" stopOpacity={0.9} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="0"
                  vertical={false}
                  stroke="#E0F2FE"
                  strokeWidth={1}
                />

                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 9, fontWeight: 800, letterSpacing: '0.05em' }}
                  dy={10}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#CBD5E1', fontSize: 9, fontWeight: 700 }}
                  width={24}
                />

                <Tooltip
                  content={<BookingsTooltip />}
                  cursor={{ fill: '#E0F2FE', radius: 8 }}
                />

                {/* Average reference line */}
                <ReferenceLine
                  y={avgBookings}
                  yAxisId={0}
                  stroke="#0EA5E9"
                  strokeDasharray="4 4"
                  strokeOpacity={0.4}
                  strokeWidth={1.5}
                />

                <Bar
                  dataKey="bookings"
                  fill="url(#bookingsBarGrad)"
                  shape={<RoundedBar />}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Avg line label */}
        <div className="flex items-center gap-1.5 px-6 pb-4 pt-1">
          <div className="w-6 h-px border-t-2 border-dashed border-sky-400 opacity-60" />
          <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest opacity-70">
            Daily Average: {avgBookings}
          </span>
        </div>
      </div>

      {/* ── CHART 2: PROJECTED INCOME (AREA + LINE CHART) ── */}
      <div className="w-full rounded-[28px] overflow-hidden border border-slate-100 bg-white shadow-sm">
        {/* Chart Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <TrendingUp size={15} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">7-Day Projection</p>
              <h3 className="text-sm font-black text-slate-800 tracking-tight leading-tight">Projected Income</h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Peak</p>
              <p className="text-sm font-black text-emerald-600">₱{maxIncome.toLocaleString()}</p>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avg / Day</p>
              <p className="text-sm font-black text-slate-700">₱{avgIncome.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Income Area + Line Chart with emerald-tinted background */}
        <div
          className="px-4 pt-4 pb-2"
          style={{
            background: 'linear-gradient(180deg, #F0FDF4 0%, #ffffff 100%)',
          }}
        >
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 8, bottom: 0, left: 0 }}
              >
                <defs>
                  {/* Emerald fill gradient for area under the line */}
                  <linearGradient id="incomeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.18} />
                    <stop offset="60%" stopColor="#10B981" stopOpacity={0.05} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>

                  {/* Stroke gradient for the income line itself */}
                  <linearGradient id="incomeLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#34D399" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="0"
                  vertical={false}
                  stroke="#D1FAE5"
                  strokeWidth={1}
                />

                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 9, fontWeight: 800, letterSpacing: '0.05em' }}
                  dy={10}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#CBD5E1', fontSize: 9, fontWeight: 700 }}
                  width={42}
                  tickFormatter={(v) =>
                    v >= 1000 ? `₱${(v / 1000).toFixed(1)}k` : `₱${v}`
                  }
                />

                <Tooltip
                  content={<IncomeTooltip />}
                  cursor={{ stroke: '#10B981', strokeWidth: 1, strokeDasharray: '4 4' }}
                />

                {/* Average reference line */}
                <ReferenceLine
                  y={avgIncome}
                  stroke="#10B981"
                  strokeDasharray="4 4"
                  strokeOpacity={0.35}
                  strokeWidth={1.5}
                />

                {/* Filled area under the line */}
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="url(#incomeLineGrad)"
                  strokeWidth={3}
                  fill="url(#incomeAreaGrad)"
                  dot={<CustomDot />}
                  activeDot={<CustomActiveDot />}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Avg line label */}
        <div className="flex items-center gap-1.5 px-6 pb-4 pt-1">
          <div className="w-6 h-px border-t-2 border-dashed border-emerald-400 opacity-60" />
          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest opacity-70">
            Daily Average: ₱{avgIncome.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Loading overlay shown when no data is passed */}
      {(!data || data.length === 0) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[2px] rounded-3xl z-10">
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
