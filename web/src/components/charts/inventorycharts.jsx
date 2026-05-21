import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

/**
 * INVENTORY CHARTS
 * Visualizes stock levels to identify items that need restocking.
 */
const InventoryCharts = ({ items }) => {
  // Prepare data for the chart
  const data = items.map(item => ({
    name: item.item_name,
    stock: item.current_stock,
    reorder: item.reorder_point
  }));

  return (
    <div className="w-full h-80 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm mt-8">
      <h3 className="text-lg font-black text-slate-900 mb-6">Stock Level Analysis</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip 
            cursor={{ fill: '#f1f5f9' }}
            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey="stock" radius={[8, 8, 0, 0]}>
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