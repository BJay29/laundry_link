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
 */
const InventoryCharts = ({ items }) => {
  // Check if items array is valid
  if (!items || items.length === 0) {
    return (
      <div className="w-full h-80 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm mt-8 flex flex-col items-center justify-center">
        <p className="text-slate-400 font-medium">No inventory data available.</p>
        <p className="text-slate-300 text-sm">Add supplies to see the chart.</p>
      </div>
    );
  }

  // Prepare data for the chart
  const data = items.map(item => ({
    name: item.item_name,
    stock: item.current_stock,
    reorder: item.reorder_point
  }));

  // Calculate the average reorder point to show a general trend line
  const avgReorder = data.reduce((acc, curr) => acc + curr.reorder, 0) / data.length;

  return (
    <div className="w-full h-96 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm mt-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-black text-slate-900">Stock Status Overview</h3>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Real-time inventory levels</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
            <span className="w-3 h-3 bg-violet-500 rounded-full"></span> Adequate
            <span className="w-3 h-3 bg-red-500 rounded-full ml-2"></span> Low Stock
          </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false} 
            dy={10}
            className="font-bold text-slate-600"
          />
          <YAxis fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip 
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{ 
              borderRadius: '16px', 
              border: 'none', 
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
            }}
          />
          {/* Reference line showing the average reorder point for context */}
          <ReferenceLine y={avgReorder} stroke="#cbd5e1" strokeDasharray="3 3" />
          
          <Bar dataKey="stock" radius={[10, 10, 0, 0]} barSize={32}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.stock <= entry.reorder ? '#ef4444' : '#8b5cf6'} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default InventoryCharts;