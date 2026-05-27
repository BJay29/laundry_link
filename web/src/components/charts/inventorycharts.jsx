import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LineChart,
  Line,
  ComposedChart,
  Area
} from 'recharts';
import { Package, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * INVENTORY CHARTS
 * Visualizes current stock levels against reorder points.
 * Automatically highlights items in red if they drop below the safety threshold.
 * Matches the dashboard design language: dark chart bars, teal accents, clean stat cards.
 */
const InventoryCharts = ({ items = [], loading = false }) => {
  // Empty state
  if (!items || items.length === 0) {
    return (
      <div className="w-full bg-white p-8 rounded-2xl border border-gray-100 shadow-sm mt-8 flex flex-col items-center justify-center min-h-80">
        <Package size={32} className="text-gray-300 mb-3" />
        <p className="text-gray-400 font-semibold">No inventory data available</p>
        <p className="text-gray-300 text-sm mt-1">Add supplies to see the chart</p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="w-full bg-white p-8 rounded-2xl border border-gray-100 shadow-sm mt-8 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Loading chart...</p>
        </div>
      </div>
    );
  }

  // Prepare chart data with explicit numeric conversion and safety checks
  const chartData = items.map(item => ({
    name: (item?.item_name || 'Unknown').length > 14
      ? (item?.item_name || '').substring(0, 14) + '…'
      : (item?.item_name || 'Unknown'),
    fullName: item?.item_name || 'Unknown',
    stock: parseFloat(item?.current_stock) || 0,
    reorder: parseFloat(item?.reorder_point) || 0,
    unit: item?.unit || '',
    category: item?.category || 'General',
  }));

  // Average reorder threshold reference line
  const avgReorder = chartData.length > 0
    ? chartData.reduce((acc, curr) => acc + curr.reorder, 0) / chartData.length
    : 0;

  // Summary counts for the stat pills
  const criticalItems = chartData.filter(item => item.stock <= item.reorder * 0.5).length;
  const lowItems = chartData.filter(item => item.stock > item.reorder * 0.5 && item.stock <= item.reorder).length;
  const okItems = chartData.filter(item => item.stock > item.reorder).length;

  // Custom tooltip matching dashboard card style
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isLow = data.stock <= data.reorder;

      return (
        <div className="bg-white border border-gray-100 shadow-xl rounded-xl p-4 min-w-[180px]">
          <p className="font-bold text-gray-900 text-sm mb-2">{data.fullName}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">{data.category}</p>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Current Stock</span>
              <span className="text-xs font-bold text-gray-900">{data.stock} {data.unit}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Reorder Point</span>
              <span className="text-xs font-semibold text-amber-500">{data.reorder} {data.unit}</span>
            </div>
          </div>
          <div className={`mt-3 pt-2 border-t border-gray-100 flex items-center gap-1.5`}>
            <span className={`w-2 h-2 rounded-full ${isLow ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
            <span className={`text-xs font-bold ${isLow ? 'text-red-600' : 'text-emerald-600'}`}>
              {isLow ? 'Low Stock' : 'Adequate'}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm mt-8">

      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 mb-1">
            Stock Analysis
          </p>
          <h3 className="text-xl font-bold text-gray-900">Stock Status Overview</h3>
        </div>

        {/* Stat pills matching dashboard card style */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Adequate */}
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <div>
              <p className="text-xs text-emerald-600 font-medium leading-none">Adequate</p>
              <p className="text-lg font-bold text-emerald-700 leading-tight">{okItems}</p>
            </div>
          </div>

          {/* Low */}
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            <TrendingDown size={14} className="text-amber-500" />
            <div>
              <p className="text-xs text-amber-600 font-medium leading-none">Low</p>
              <p className="text-lg font-bold text-amber-700 leading-tight">{lowItems}</p>
            </div>
          </div>

          {/* Critical */}
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            <AlertTriangle size={14} className="text-red-500" />
            <div>
              <p className="text-xs text-red-600 font-medium leading-none">Critical</p>
              <p className="text-lg font-bold text-red-700 leading-tight">{criticalItems}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-6">
        <div className="w-full h-80 md:h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 16, right: 24, left: 0, bottom: 56 }}
              barCategoryGap="30%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="name"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={12}
                tick={{ fill: '#94a3b8', fontWeight: 600 }}
                interval={chartData.length > 10 ? Math.floor(chartData.length / 10) : 0}
              />
              <YAxis
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8' }}
                label={{ value: 'Quantity', angle: -90, position: 'insideLeft', fill: '#cbd5e1', fontSize: 11 }}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: '#f8fafc', radius: 6 }}
              />

              {/* Average reorder reference line */}
              <ReferenceLine
                y={avgReorder}
                stroke="#10b981"
                strokeDasharray="6 4"
                strokeOpacity={0.6}
                label={{
                  value: `Avg: ${avgReorder.toFixed(1)}`,
                  position: 'insideTopRight',
                  fill: '#10b981',
                  fontSize: 11,
                  fontWeight: 600
                }}
              />

              {/* Bars — dark (slate-700) when adequate, red when low, matching dashboard bar style */}
              <Bar
                dataKey="stock"
                radius={[6, 6, 0, 0]}
                barSize={Math.max(18, 52 - chartData.length * 1.5)}
                name="Current Stock"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.stock <= entry.reorder ? '#ef4444' : '#334155'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend footer */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-slate-700"></span>
            <span className="text-xs text-gray-500 font-medium">Adequate Stock</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-red-500"></span>
            <span className="text-xs text-gray-500 font-medium">Low / Critical Stock</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 border-t-2 border-dashed border-emerald-500"></span>
            <span className="text-xs text-gray-500 font-medium">Avg Reorder Threshold</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryCharts;
