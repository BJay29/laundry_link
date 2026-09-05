import React from 'react';
import PropTypes from 'prop-types';
import {
  BarChart,
  Bar,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Activity, TrendingUp, BarChart2, Sun, Cloud, CloudRain, Sparkles, ShieldQuestion } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// MODEL TIER BADGE
// Shows which forecasting tier produced the current data — lets the shop
// owner (and anyone reviewing the system) see at a glance whether they're
// looking at a model trained on this shop's own history, a pooled/cold-start
// estimate for a newer shop, or a weather-only outlook for a shop with no
// bookings yet at all.
// ─────────────────────────────────────────────────────────────────────────────
const MODEL_TIER_CONFIG = {
  shop_model: {
    label: 'Your Shop\u2019s Own Model',
    icon: Sparkles,
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
  },
  pooled_model: {
    label: 'Pooled Model \u2014 Building Your History',
    icon: TrendingUp,
    bg: 'bg-sky-50',
    text: 'text-sky-600',
  },
  weather_only: {
    label: 'Insufficient Data \u2014 Weather Outlook Only',
    icon: ShieldQuestion,
    bg: 'bg-amber-50',
    text: 'text-amber-600',
  },
};

const ModelTierBadge = ({ modelTier }) => {
  const config = MODEL_TIER_CONFIG[modelTier];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full ${config.bg} ${config.text}`}>
      <Icon size={13} strokeWidth={2.5} />
      <span className="text-[10px] font-black uppercase tracking-widest">{config.label}</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// WEATHER OUTLOOK STRIP
// One card per forecast day: weather icon (from rain_mm), the day label,
// and the rainfall figure. Rendered as plain flex/tailwind rather than a
// recharts axis, since mixing a ₱/count scale with a mm-of-rain scale on
// one chart is harder to read than showing weather as its own row.
// ─────────────────────────────────────────────────────────────────────────────
const getWeatherIcon = (rainMm) => {
  if (rainMm >= 5) return { Icon: CloudRain, color: 'text-sky-600' };
  if (rainMm >= 1) return { Icon: Cloud, color: 'text-slate-400' };
  return { Icon: Sun, color: 'text-amber-400' };
};

const WeatherOutlookStrip = ({ data }) => (
  <div className="w-full rounded-[28px] overflow-hidden border border-slate-100 bg-white shadow-sm mb-6">
    <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-slate-50">
      <div className="p-2 bg-sky-50 rounded-xl">
        <CloudRain size={15} className="text-sky-500" />
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">7-Day Outlook</p>
        <h3 className="text-sm font-black text-slate-800 tracking-tight leading-tight">Weather Forecast</h3>
      </div>
    </div>
    <div className="grid grid-cols-7 gap-2 p-4">
      {data.map((item, idx) => {
        const rainMm = item.rain_mm || 0;
        const { Icon, color } = getWeatherIcon(rainMm);
        const isRainy = rainMm >= 5;
        return (
          <div
            key={idx}
            className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl ${isRainy ? 'bg-sky-50' : 'bg-slate-50/50'}`}
          >
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">{item.day}</span>
            <Icon size={20} className={color} strokeWidth={2} />
            <span className="text-[10px] font-bold text-slate-500">{rainMm.toFixed(1)}mm</span>
          </div>
        );
      })}
    </div>
    <p className="text-[10px] text-slate-400 font-medium px-6 pb-4">
      Rainier days tend to shift demand up in this forecast \u2014 more people send out laundry when it's harder to dry at home.
    </p>
  </div>
);

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
      <rect x={x + 2} y={y + 4} width={width - 4} height={height} rx={radius} ry={radius} fill="#0EA5E9" opacity={0.12} />
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
// EMPTY-FORECAST NOTICE (Tier 3 — weather_only)
// Shown instead of the bar/income charts when the backend has no basis yet
// to predict bookings/income for this shop (brand-new shop, no pooled
// model available either). The weather strip above still renders with
// real data — only the currency/count charts are replaced.
// ─────────────────────────────────────────────────────────────────────────────
const InsufficientDataNotice = () => (
  <div className="flex flex-col items-center justify-center py-16 px-6 bg-amber-50/40 border-2 border-dashed border-amber-100 rounded-[28px] text-center">
    <ShieldQuestion className="text-amber-300 mb-3" size={36} />
    <p className="text-slate-600 font-bold text-sm mb-1">Not enough booking history yet for a revenue forecast.</p>
    <p className="text-slate-400 text-xs font-medium max-w-md">
      The weather outlook above is real \u2014 booking and income predictions will appear here automatically
      once this shop (or the platform as a whole) has enough data to calibrate against.
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FORECAST CHARTS COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const ForecastCharts = ({ data, modelTier }) => {
  const chartData = data && data.length > 0 ? data : [
    { day: 'May 20', bookings: 12, income: 2500, rain_mm: 0 },
    { day: 'May 21', bookings: 10, income: 2100, rain_mm: 2 },
    { day: 'May 22', bookings: 15, income: 3200, rain_mm: 8 },
    { day: 'May 23', bookings: 22, income: 4800, rain_mm: 12 },
    { day: 'May 24', bookings: 25, income: 5500, rain_mm: 6 },
    { day: 'May 25', bookings: 14, income: 2900, rain_mm: 0 },
    { day: 'May 26', bookings: 24, income: 5100, rain_mm: 1 },
  ];

  const isWeatherOnly = modelTier === 'weather_only';

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

      {modelTier && (
        <div>
          <ModelTierBadge modelTier={modelTier} />
        </div>
      )}

      {/* ── WEATHER OUTLOOK STRIP — always shown when we have rain data ── */}
      <WeatherOutlookStrip data={chartData} />

      {isWeatherOnly ? (
        <InsufficientDataNotice />
      ) : (
        <>
          {/* ── CHART 1: TOTAL BOOKINGS (BAR CHART) ── */}
          <div className="w-full rounded-[28px] overflow-hidden border border-slate-100 bg-white shadow-sm">
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

            <div className="px-4 pt-4 pb-2" style={{ background: 'linear-gradient(180deg, #F0F9FF 0%, #ffffff 100%)' }}>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: -10 }} barCategoryGap="30%">
                    <defs>
                      <linearGradient id="bookingsBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38BDF8" stopOpacity={1} />
                        <stop offset="100%" stopColor="#0284C7" stopOpacity={0.9} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="#E0F2FE" strokeWidth={1} />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 9, fontWeight: 800, letterSpacing: '0.05em' }}
                      dy={10}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#CBD5E1', fontSize: 9, fontWeight: 700 }} width={24} />
                    <Tooltip content={<BookingsTooltip />} cursor={{ fill: '#E0F2FE', radius: 8 }} />
                    <ReferenceLine y={avgBookings} yAxisId={0} stroke="#0EA5E9" strokeDasharray="4 4" strokeOpacity={0.4} strokeWidth={1.5} />
                    <Bar dataKey="bookings" fill="url(#bookingsBarGrad)" shape={<RoundedBar />} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-6 pb-4 pt-1">
              <div className="w-6 h-px border-t-2 border-dashed border-sky-400 opacity-60" />
              <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest opacity-70">
                Daily Average: {avgBookings}
              </span>
            </div>
          </div>

          {/* ── CHART 2: PROJECTED INCOME (AREA + LINE CHART) ── */}
          <div className="w-full rounded-[28px] overflow-hidden border border-slate-100 bg-white shadow-sm">
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

            <div className="px-4 pt-4 pb-2" style={{ background: 'linear-gradient(180deg, #F0FDF4 0%, #ffffff 100%)' }}>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="incomeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.18} />
                        <stop offset="60%" stopColor="#10B981" stopOpacity={0.05} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="incomeLineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#34D399" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="#D1FAE5" strokeWidth={1} />
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
                      tickFormatter={(v) => (v >= 1000 ? `₱${(v / 1000).toFixed(1)}k` : `₱${v}`)}
                    />
                    <Tooltip content={<IncomeTooltip />} cursor={{ stroke: '#10B981', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <ReferenceLine y={avgIncome} stroke="#10B981" strokeDasharray="4 4" strokeOpacity={0.35} strokeWidth={1.5} />
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

            <div className="flex items-center gap-1.5 px-6 pb-4 pt-1">
              <div className="w-6 h-px border-t-2 border-dashed border-emerald-400 opacity-60" />
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest opacity-70">
                Daily Average: ₱{avgIncome.toLocaleString()}
              </span>
            </div>
          </div>
        </>
      )}

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
      rain_mm: PropTypes.number,
    })
  ),
  modelTier: PropTypes.oneOf(['shop_model', 'pooled_model', 'weather_only']),
};

export default ForecastCharts;
