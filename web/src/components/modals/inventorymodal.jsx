import React, { useState, useEffect } from 'react';
import { X, Save, Package } from 'lucide-react';

/**
 * INVENTORY MODAL
 * A dedicated modal for updating stock levels and reorder points.
 * @param {boolean} isOpen - Controls visibility of the modal.
 * @param {Function} onClose - Function to close the modal.
 * @param {Object} item - The inventory item currently selected for editing.
 * @param {Function} onSave - Function to persist changes to the backend.
 */
const InventoryModal = ({ isOpen, onClose, item, onSave }) => {
  const [formData, setFormData] = useState({
    current_stock: '',
    reorder_point: ''
  });

  // Sync modal data whenever the selected item changes
  useEffect(() => {
    if (item) {
      setFormData({
        current_stock: item.current_stock || 0,
        reorder_point: item.reorder_point || 0
      });
    }
  }, [item]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(item.id, formData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl border border-slate-100">
        <div className="flex justify-between items-start mb-6">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl">
            <Package size={24} />
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">
          Update {item?.item_name}
        </h3>
        <p className="text-slate-500 text-sm font-medium mb-6">
          Modify stock levels and reorder alerts.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
              Current Stock ({item?.unit})
            </label>
            <input 
              type="number"
              value={formData.current_stock}
              onChange={(e) => setFormData({...formData, current_stock: parseFloat(e.target.value) || 0})}
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
              Reorder Point
            </label>
            <input 
              type="number"
              value={formData.reorder_point}
              onChange={(e) => setFormData({...formData, reorder_point: parseFloat(e.target.value) || 0})}
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-bold"
            />
          </div>
          
          <button 
            type="submit"
            className="w-full py-4 mt-2 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-violet-500/25 active:scale-95 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
};

export default InventoryModal;