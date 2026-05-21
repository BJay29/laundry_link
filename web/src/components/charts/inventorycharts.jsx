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
  Legend
} from 'recharts';

/**
 * INVENTORY CHARTS
 * Visualizes stock levels and compares them against reorder points to identify items that need restocking.
 */
const InventoryCharts = ({ items }) => {
  // Validate if items exist to prevent mapping errors
  if (!items || items.length === 0) {
    return (
      <div className="w-full h-80 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm mt-8 flex items-center justify-center">
        <p className="text-slate-400 font-medium">No inventory data available to display.</p>
      </div>
    );
  }

  // Prepare data for the chart by mapping database fields
  const data = items.map(item => ({
    name: item.item_name,
    stock: item.current_stock,
    reorder: item.reorder_point
  }));

  return (
    <div className="w-full h-80 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm mt-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-black text-slate-900">Stock Level Analysis</h3>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <span className="w-3 h-3 bg-violet-500 rounded-full"></span> Healthy
          <span className="w-3 h-3 bg-red-500 rounded-full ml-2"></span> Reorder
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{ 
              borderRadius: '16px', 
              border: 'none', 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
            }}
          />
          <Bar dataKey="stock" radius={[8, 8, 0, 0]} barSize={40}>
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