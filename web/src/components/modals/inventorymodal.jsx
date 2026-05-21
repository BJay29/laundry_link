import React, { useState, useEffect } from 'react';
import { X, Save, Package } from 'lucide-react';

/**
 * INVENTORY MODAL
 * Handles creation and editing of inventory items.
 * Optimized for state synchronization and reliable submission.
 */
const InventoryModal = ({ isOpen, onClose, item, onSave }) => {
  const [formData, setFormData] = useState({
    item_name: '',
    category: 'General',
    current_stock: 0,
    reorder_point: 0,
    unit: 'pcs',
    usage_rate: 0
  });

  // Sync state whenever the item prop changes
  useEffect(() => {
    if (item) {
      setFormData({
        item_name: item.item_name || '',
        category: item.category || 'General',
        current_stock: parseFloat(item.current_stock) || 0,
        reorder_point: parseFloat(item.reorder_point) || 0,
        unit: item.unit || 'pcs',
        usage_rate: parseFloat(item.usage_rate) || 0
      });
    } else {
      // Reset form for adding new item
      setFormData({
        item_name: '',
        category: 'General',
        current_stock: 0,
        reorder_point: 0,
        unit: 'pcs',
        usage_rate: 0
      });
    }
  }, [item]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Safety check: Ensure required data is present
    if (!formData.item_name) {
      alert("Item name is required!");
      return;
    }

    // Call the parent onSave function with sanitized numeric data and mandatory unit field
    const finalData = {
      ...formData,
      current_stock: parseFloat(formData.current_stock || 0),
      reorder_point: parseFloat(formData.reorder_point || 0),
      usage_rate: parseFloat(formData.usage_rate || 0),
      unit: formData.unit || 'pcs' // Ensure unit is always sent
    };

    onSave(item ? item.id : null, finalData);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl border border-slate-100">
        <div className="flex justify-between items-start mb-6">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl">
            <Package size={24} />
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">
          {item ? `Update ${item.item_name}` : "Add New Inventory Item"}
        </h3>
        <p className="text-slate-500 text-sm font-medium mb-6">
          {item ? "Modify stock levels and reorder alerts." : "Define item details and consumption rate."}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Item Name</label>
            <input 
              type="text"
              value={formData.item_name}
              onChange={(e) => setFormData({...formData, item_name: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-bold"
              placeholder="e.g., Detergent Powder"
              disabled={!!item} // Disable name editing if in edit mode
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Category</label>
            <select 
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-bold"
            >
              <option value="General">General</option>
              <option value="Detergent">Detergent</option>
              <option value="Softener">Softener</option>
              <option value="Packaging">Packaging</option>
              <option value="Cleaning">Cleaning</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Stock</label>
              <input 
                type="number"
                value={formData.current_stock}
                onChange={(e) => setFormData({...formData, current_stock: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Reorder</label>
              <input 
                type="number"
                value={formData.reorder_point}
                onChange={(e) => setFormData({...formData, reorder_point: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Usage Rate (per load)</label>
            <input 
              type="number"
              step="0.01"
              value={formData.usage_rate}
              onChange={(e) => setFormData({...formData, usage_rate: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-bold"
            />
          </div>
          
          <button 
            type="submit"
            className="w-full py-4 mt-2 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-violet-500/25 active:scale-95 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {item ? "Save Changes" : "Add Item"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InventoryModal;