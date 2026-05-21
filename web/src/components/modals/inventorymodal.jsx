import React, { useState, useEffect } from 'react';
import { X, Save, Package, AlertCircle } from 'lucide-react'; 

/**
 * INVENTORY MODAL
 * Handles creation and editing of inventory items.
 * Optimized for state synchronization and reliable form submission.
 * Features:
 * - Form validation with error messages
 * - Real-time state synchronization with item prop
 * - Disabled item name for edit mode to prevent duplicate names
 * - Shop ID validation from localStorage
 * - Loading state during submission
 * - Responsive design with Tailwind CSS
 */
const InventoryModal = ({ isOpen, onClose, item, onSave, loading = false }) => {
  // Form state management
  const [formData, setFormData] = useState({
    item_name: '',
    category: 'General',
    current_stock: 0,
    reorder_point: 0,
    unit: 'kg',
    usage_rate: 0.05
  });

  // Validation errors state
  const [errors, setErrors] = useState({});

  // Predefined categories for selection
  const categories = ['General', 'Detergent', 'Softener', 'Packaging', 'Cleaning', 'Chemical'];
  
  // Predefined units for selection
  const units = ['kg', 'liters', 'pieces', 'boxes', 'bags', 'pcs'];

  /**
   * Synchronize form data whenever the item prop changes.
   * This ensures the form is properly populated when editing an existing item.
   */
  useEffect(() => {
    if (item && isOpen) {
      setFormData({
        item_name: item.item_name || '',
        category: item.category || 'General',
        current_stock: parseFloat(item.current_stock) || 0,
        reorder_point: parseFloat(item.reorder_point) || 0,
        unit: item.unit || 'kg',
        usage_rate: parseFloat(item.usage_rate) || 0.05
      });
      setErrors({});
    } else if (isOpen) {
      // Reset form for new item creation
      setFormData({
        item_name: '',
        category: 'General',
        current_stock: 0,
        reorder_point: 0,
        unit: 'kg',
        usage_rate: 0.05
      });
      setErrors({});
    }
  }, [item, isOpen]);

  /**
   * Validate form data before submission.
   * Checks for required fields and valid numeric values.
   */
  const validateForm = () => {
    const newErrors = {};

    // Validate item name
    if (!formData.item_name || !formData.item_name.trim()) {
      newErrors.item_name = 'Item name is required';
    }

    // Validate stock level
    if (formData.current_stock < 0) {
      newErrors.current_stock = 'Stock cannot be negative';
    }

    // Validate reorder point
    if (formData.reorder_point < 0) {
      newErrors.reorder_point = 'Reorder point cannot be negative';
    }

    // Validate usage rate
    if (formData.usage_rate < 0) {
      newErrors.usage_rate = 'Usage rate cannot be negative';
    }

    // Validate that unit is selected
    if (!formData.unit || !formData.unit.trim()) {
      newErrors.unit = 'Unit is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form input changes.
   * Converts numeric inputs to proper type and clears errors for that field.
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }

    // Convert to appropriate type
    if (name === 'item_name' || name === 'category' || name === 'unit') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    }
  };

  /**
   * Handle form submission.
   * Validates form data and calls onSave callback with proper payload.
   */
  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Get shop ID from localStorage
    const shopId = localStorage.getItem('shop_id');
    
    // Validate shop ID exists
    if (!shopId) {
      setErrors({
        submit: 'Session error: Shop ID not found. Please log in again.'
      });
      return;
    }

    // Build final payload with all required fields
    const finalData = {
      item_name: formData.item_name.trim(),
      category: formData.category,
      current_stock: parseFloat(formData.current_stock) || 0,
      reorder_point: parseFloat(formData.reorder_point) || 0,
      usage_rate: parseFloat(formData.usage_rate) || 0.05,
      unit: formData.unit,
      shop_id: parseInt(shopId, 10)
    };

    // Call onSave callback with item ID (if editing) and data
    onSave(item ? item.id : null, finalData);
  };

  // Return null if modal is not open
  if (!isOpen) return null;

  const isEditMode = !!item;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal Container */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-100">
        
        {/* Modal Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <Package size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {isEditMode ? 'Edit Inventory Item' : 'Add New Item'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {isEditMode ? 'Update stock levels and settings' : 'Add a new item to your inventory'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg transition-colors"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Submit Error Alert */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errors.submit}</p>
            </div>
          )}

          {/* Item Name Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input 
              type="text"
              name="item_name"
              value={formData.item_name}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 bg-gray-50 rounded-lg border transition-all outline-none font-medium ${
                errors.item_name 
                  ? 'border-red-300 focus:ring-2 focus:ring-red-200' 
                  : 'border-gray-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-400'
              }`}
              placeholder="e.g., Detergent Powder, Fabric Softener"
              disabled={loading || isEditMode}
              title={isEditMode ? 'Item name cannot be changed' : ''}
            />
            {errors.item_name && (
              <p className="text-sm text-red-600 mt-1">{errors.item_name}</p>
            )}
          </div>

          {/* Category and Unit Fields */}
          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category
              </label>
              <select 
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none font-medium transition-all"
                disabled={loading}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Unit <span className="text-red-500">*</span>
              </label>
              <select 
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 bg-gray-50 rounded-lg border transition-all outline-none font-medium ${
                  errors.unit 
                    ? 'border-red-300 focus:ring-2 focus:ring-red-200' 
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-400'
                }`}
                disabled={loading}
              >
                {units.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
              {errors.unit && (
                <p className="text-sm text-red-600 mt-1">{errors.unit}</p>
              )}
            </div>
          </div>

          {/* Stock and Reorder Point Fields */}
          <div className="grid grid-cols-2 gap-4">
            {/* Current Stock */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Current Stock <span className="text-red-500">*</span>
              </label>
              <input 
                type="number"
                name="current_stock"
                value={formData.current_stock}
                onChange={handleChange}
                step="0.01"
                min="0"
                className={`w-full px-4 py-2.5 bg-gray-50 rounded-lg border transition-all outline-none font-medium ${
                  errors.current_stock 
                    ? 'border-red-300 focus:ring-2 focus:ring-red-200' 
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-400'
                }`}
                placeholder="0.00"
                disabled={loading}
              />
              {errors.current_stock && (
                <p className="text-sm text-red-600 mt-1">{errors.current_stock}</p>
              )}
            </div>

            {/* Reorder Point */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reorder Point <span className="text-red-500">*</span>
              </label>
              <input 
                type="number"
                name="reorder_point"
                value={formData.reorder_point}
                onChange={handleChange}
                step="0.01"
                min="0"
                className={`w-full px-4 py-2.5 bg-gray-50 rounded-lg border transition-all outline-none font-medium ${
                  errors.reorder_point 
                    ? 'border-red-300 focus:ring-2 focus:ring-red-200' 
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-400'
                }`}
                placeholder="0.00"
                disabled={loading}
              />
              {errors.reorder_point && (
                <p className="text-sm text-red-600 mt-1">{errors.reorder_point}</p>
              )}
            </div>
          </div>

          {/* Usage Rate Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Usage Rate (daily consumption)
            </label>
            <input 
              type="number"
              name="usage_rate"
              value={formData.usage_rate}
              onChange={handleChange}
              step="0.01"
              min="0"
              className={`w-full px-4 py-2.5 bg-gray-50 rounded-lg border transition-all outline-none font-medium ${
                errors.usage_rate 
                  ? 'border-red-300 focus:ring-2 focus:ring-red-200' 
                  : 'border-gray-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-400'
              }`}
              placeholder="0.05"
              disabled={loading}
            />
            {errors.usage_rate && (
              <p className="text-sm text-red-600 mt-1">{errors.usage_rate}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Average amount consumed per day for automatic depletion calculation
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg transition-colors disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <Save size={18} />
              {loading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryModal;