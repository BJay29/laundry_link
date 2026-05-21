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
  ReferenceLine
} from 'recharts';

/**
 * INVENTORY CHARTS
 * Visualizes current stock levels against reorder points.
 * Automatically highlights items in red if they drop below the safety threshold.
 * Uses color coding: Violet for adequate stock, Red for low stock items.
 */
const InventoryCharts = ({ items, loading = false }) => {
  // Check if items array is valid
  if (!items || items.length === 0) {
    return (
      <div className="w-full bg-white p-6 md:p-8 rounded-lg border border-slate-200 shadow-sm mt-8 flex flex-col items-center justify-center min-h-80">
        <div className="text-center">
          <p className="text-slate-400 font-medium text-lg">No inventory data available</p>
          <p className="text-slate-300 text-sm mt-2">Add supplies to see the chart</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full bg-white p-6 md:p-8 rounded-lg border border-slate-200 shadow-sm mt-8 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading chart...</p>
        </div>
      </div>
    );
  }

  // Prepare data for the chart with explicit numeric conversion
  const chartData = items.map(item => ({
    name: item.item_name.length > 15 ? item.item_name.substring(0, 15) + '...' : item.item_name,
    fullName: item.item_name,
    stock: parseFloat(item.current_stock) || 0,
    reorder: parseFloat(item.reorder_point) || 0,
    unit: item.unit,
    category: item.category
  }));

  // Calculate the average reorder point to show a general trend line
  const avgReorder = chartData.length > 0 
    ? chartData.reduce((acc, curr) => acc + curr.reorder, 0) / chartData.length 
    : 0;

  // Calculate statistics
  const criticalItems = chartData.filter(item => item.stock <= item.reorder * 0.5).length;
  const lowItems = chartData.filter(item => item.stock > item.reorder * 0.5 && item.stock <= item.reorder).length;
  const okItems = chartData.filter(item => item.stock > item.reorder).length;

  // Custom tooltip to show more information
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const status = data.stock <= data.reorder 
        ? '🔴 LOW STOCK' 
        : '✅ OK';
      
      return (
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-lg">
          <p className="font-semibold text-slate-900">{data.fullName}</p>
          <p className="text-sm text-slate-600">Category: {data.category}</p>
          <p className="text-sm font-semibold text-blue-600 mt-1">
            Stock: {data.stock} {data.unit}
          </p>
          <p className="text-sm font-semibold text-yellow-600">
            Reorder: {data.reorder} {data.unit}
          </p>
          <p className={`text-sm font-bold mt-1 ${data.stock <= data.reorder ? 'text-red-600' : 'text-green-600'}`}>
            {status}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white rounded-lg border border-slate-200 shadow-sm mt-8">
      {/* Header Section */}
      <div className="p-6 md:p-8 border-b border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900">Stock Status Overview</h3>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mt-2">
              Real-time inventory levels across all items
            </p>
          </div>
          
          {/* Legend and Statistics */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-violet-500 rounded-full"></span>
                <span className="text-xs font-semibold text-slate-600">Adequate Stock</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                <span className="text-xs font-semibold text-slate-600">Low Stock</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-slate-400" style={{ borderStyle: 'dashed' }}></span>
                <span className="text-xs font-semibold text-slate-600">Average Threshold</span>
              </div>
            </div>
            
            {/* Quick Statistics */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">✅ {okItems} OK</span>
              <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded">⚠️ {lowItems} Low</span>
              <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">🔴 {criticalItems} Critical</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="p-6 md:p-8">
        <div className="w-full h-96 md:h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false} 
                stroke="#e2e8f0" 
                opacity={0.5}
              />
              <XAxis 
                dataKey="name" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
                interval={chartData.length > 8 ? Math.floor(chartData.length / 8) : 0}
                className="font-semibold text-slate-600"
              />
              <YAxis 
                fontSize={11} 
                tickLine={false} 
                axisLine={false}
                label={{ value: 'Quantity', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                content={<CustomTooltip />}
                cursor={{ fill: '#f8fafc', opacity: 0.5 }}
              />
              
              {/* Reference line showing the average reorder point for context */}
              <ReferenceLine 
                y={avgReorder} 
                stroke="#94a3b8" 
                strokeDasharray="5 5"
                label={{ value: `Avg Threshold: ${avgReorder.toFixed(2)}`, position: 'right', fill: '#64748b', fontSize: 11 }}
              />
              
              {/* Bar chart showing stock levels */}
              <Bar 
                dataKey="stock" 
                radius={[8, 8, 0, 0]} 
                barSize={Math.max(20, 60 - chartData.length)}
                name="Current Stock"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.stock <= entry.reorder ? '#ef4444' : '#8b5cf6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart Information Footer */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-600">
            <strong>Chart Guide:</strong> Purple bars represent adequate stock levels. Red bars indicate items below or near the reorder point. 
            The dashed line shows the average reorder threshold across all inventory items.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InventoryCharts;