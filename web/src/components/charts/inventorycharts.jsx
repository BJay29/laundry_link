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
 * * @param {Array} items - Array of inventory objects containing item_name, current_stock, and reorder_point.
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
      <h3 className="text-lg font-black text-slate-900 mb-6">Stock Level Analysis</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip 
            cursor={{ fill: '#f1f5f9' }}
            contentStyle={{ 
              borderRadius: '16px', 
              border: 'none', 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
            }}
          />
          <Bar dataKey="stock" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                // Highlights items in red if stock is at or below the reorder point
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