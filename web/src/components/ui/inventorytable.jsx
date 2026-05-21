import React from 'react';
import { Edit3, AlertTriangle, CheckCircle2, Gauge, Tag, AlertOctagon } from 'lucide-react';

/**
 * INVENTORY TABLE
 * Displays inventory items with color-coded status, category tags, 
 * usage rates, and interactive action buttons for stock management.
 */
const InventoryTable = ({ items, onEdit }) => {
  if (!items || items.length === 0) {
    return (
      <div className="w-full bg-white rounded-[24px] p-12 text-center border border-slate-100 shadow-sm">
        <p className="text-slate-400 font-medium">No inventory items found.</p>
      </div>
    );
  }

  // Helper function to determine status display
  const getStatus = (item) => {
    const stock = parseFloat(item.current_stock);
    const reorder = parseFloat(item.reorder_point);

    if (stock <= 0) {
      return {
        label: 'Critical',
        color: 'text-red-700',
        bg: 'bg-red-100',
        icon: <AlertOctagon size={14} />
      };
    } else if (stock <= reorder) {
      return {
        label: 'Low Stock',
        color: 'text-amber-700',
        bg: 'bg-amber-100',
        icon: <AlertTriangle size={14} />
      };
    } else {
      return {
        label: 'Stable',
        color: 'text-emerald-700',
        bg: 'bg-emerald-100',
        icon: <CheckCircle2 size={14} />
      };
    }
  };

  return (
    <div className="w-full bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="py-5 px-8 text-xs font-black text-slate-400 uppercase tracking-widest">Item Name</th>
            <th className="py-5 px-8 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Category</th>
            <th className="py-5 px-8 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Stock</th>
            <th className="py-5 px-8 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Usage Rate</th>
            <th className="py-5 px-8 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
            <th className="py-5 px-8 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {items.map((item) => {
            const status = getStatus(item);
            return (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-6 px-8 font-black text-slate-800">{item.item_name}</td>
                
                <td className="py-6 px-8 text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wide">
                    <Tag size={10} /> {item.category || 'General'}
                  </span>
                </td>

                <td className="py-6 px-8 text-center font-bold text-slate-600">
                  {parseFloat(item.current_stock)} <span className="text-slate-400 text-xs font-medium">{item.unit}</span>
                </td>

                <td className="py-6 px-8 text-center text-slate-600 font-medium">
                  <div className="flex items-center justify-center gap-1.5">
                    <Gauge size={14} className="text-violet-500" />
                    {parseFloat(item.usage_rate)} <span className="text-slate-400 text-xs italic">/load</span>
                  </div>
                </td>

                <td className="py-6 px-8 flex justify-center">
                  <span className={`flex items-center gap-2 px-3 py-1 ${status.bg} ${status.color} rounded-full text-[11px] font-black uppercase`}>
                    {status.icon} {status.label}
                  </span>
                </td>

                <td className="py-6 px-8 text-center">
                  <button 
                    onClick={() => onEdit(item)}
                    className="p-2.5 bg-slate-100 hover:bg-violet-500 hover:text-white rounded-xl transition-all active:scale-95 text-slate-600"
                  >
                    <Edit3 size={18} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;