import React from 'react';
import { Edit3, AlertTriangle, CheckCircle2, Gauge } from 'lucide-react';

/**
 * INVENTORY TABLE
 * Displays inventory items with color-coded status, usage rates, and triggerable update actions.
 */
const InventoryTable = ({ items, onEdit }) => {
  return (
    <div className="w-full bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="py-5 px-8 text-xs font-black text-slate-400 uppercase tracking-widest">Item Name</th>
            <th className="py-5 px-8 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Current Stock</th>
            <th className="py-5 px-8 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Usage Rate</th>
            <th className="py-5 px-8 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
            <th className="py-5 px-8 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="py-6 px-8 font-black text-slate-800">{item.item_name}</td>
              <td className="py-6 px-8 text-center font-bold text-slate-600">
                {item.current_stock} <span className="text-slate-400 text-xs">{item.unit}</span>
              </td>
              <td className="py-6 px-8 text-center text-slate-600 font-medium">
                <div className="flex items-center justify-center gap-1.5">
                  <Gauge size={14} className="text-violet-500" />
                  {item.usage_rate} <span className="text-slate-400 text-xs italic">/load</span>
                </div>
              </td>
              <td className="py-6 px-8 flex justify-center">
                {item.current_stock <= item.reorder_point ? (
                  <span className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full text-[11px] font-black uppercase">
                    <AlertTriangle size={14} /> Low Stock
                  </span>
                ) : (
                  <span className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-black uppercase">
                    <CheckCircle2 size={14} /> Stable
                  </span>
                )}
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
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;