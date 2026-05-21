import React, { useState, useMemo } from 'react';
import { Edit3, AlertTriangle, CheckCircle2, Gauge, Tag, AlertOctagon, Trash2, TrendingDown, ChevronUp, ChevronDown } from 'lucide-react';

/**
 * INVENTORY TABLE
 * Displays inventory items with color-coded status, category tags,
 * usage rates, and interactive action buttons for stock management.
 * Features:
 * - Color-coded status indicators (Critical, Low Stock, Stable)
 * - Category and unit display
 * - Usage rate per load display
 * - Sortable columns
 * - Delete and edit actions
 * - Empty state message
 * - Responsive design
 * - Loading state
 */
const InventoryTable = ({ 
  items, 
  onEdit, 
  onDelete,
  onRecordUsage,
  loading = false,
  sortBy = 'item_name',
  sortOrder = 'asc'
}) => {
  // Local sorting state
  const [localSortBy, setLocalSortBy] = useState(sortBy);
  const [localSortOrder, setLocalSortOrder] = useState(sortOrder);

  /**
   * Empty state - Display when no items are available
   */
  if (!items || items.length === 0) {
    return (
      <div className="w-full bg-white rounded-lg p-12 text-center border border-gray-200 shadow-sm">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="p-3 bg-gray-100 rounded-lg">
            <Tag size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-600 font-semibold">No inventory items found</p>
          <p className="text-gray-500 text-sm">Add items to start managing your inventory</p>
        </div>
      </div>
    );
  }

  /**
   * Determine status display based on stock levels
   * Returns object with label, color classes, and icon
   */
  const getStatus = (item) => {
    const stock = parseFloat(item.current_stock) || 0;
    const reorder = parseFloat(item.reorder_point) || 0;

    if (stock <= 0) {
      return {
        label: 'Out of Stock',
        color: 'text-red-700',
        bg: 'bg-red-100',
        icon: <AlertOctagon size={14} />,
        priority: 3
      };
    } else if (stock <= reorder * 0.5) {
      return {
        label: 'Critical',
        color: 'text-red-700',
        bg: 'bg-red-100',
        icon: <AlertTriangle size={14} />,
        priority: 2
      };
    } else if (stock <= reorder) {
      return {
        label: 'Low Stock',
        color: 'text-yellow-700',
        bg: 'bg-yellow-100',
        icon: <AlertTriangle size={14} />,
        priority: 1
      };
    } else {
      return {
        label: 'Adequate',
        color: 'text-green-700',
        bg: 'bg-green-100',
        icon: <CheckCircle2 size={14} />,
        priority: 0
      };
    }
  };

  /**
   * Get category badge color based on category name
   */
  const getCategoryColor = (category) => {
    const categoryColors = {
      'General': 'bg-gray-100 text-gray-700',
      'Detergent': 'bg-blue-100 text-blue-700',
      'Softener': 'bg-purple-100 text-purple-700',
      'Packaging': 'bg-orange-100 text-orange-700',
      'Cleaning': 'bg-green-100 text-green-700',
      'Chemical': 'bg-red-100 text-red-700'
    };
    return categoryColors[category] || categoryColors['General'];
  };

  /**
   * Handle column sorting
   */
  const handleSort = (column) => {
    if (localSortBy === column) {
      setLocalSortOrder(localSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setLocalSortBy(column);
      setLocalSortOrder('asc');
    }
  };

  /**
   * Sort items based on current sort column and order
   */
  const sortedItems = useMemo(() => {
    const sorted = [...items];
    
    sorted.sort((a, b) => {
      let aVal, bVal;

      switch (localSortBy) {
        case 'item_name':
          aVal = a.item_name.toLowerCase();
          bVal = b.item_name.toLowerCase();
          break;
        case 'category':
          aVal = (a.category || 'General').toLowerCase();
          bVal = (b.category || 'General').toLowerCase();
          break;
        case 'current_stock':
          aVal = parseFloat(a.current_stock) || 0;
          bVal = parseFloat(b.current_stock) || 0;
          break;
        case 'usage_rate':
          aVal = parseFloat(a.usage_rate) || 0;
          bVal = parseFloat(b.usage_rate) || 0;
          break;
        case 'status':
          aVal = getStatus(a).priority;
          bVal = getStatus(b).priority;
          break;
        default:
          aVal = a.item_name;
          bVal = b.item_name;
      }

      if (aVal < bVal) return localSortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return localSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [items, localSortBy, localSortOrder]);

  /**
   * Render sort indicator icon
   */
  const renderSortIcon = (column) => {
    if (localSortBy !== column) return null;
    return localSortOrder === 'asc' 
      ? <ChevronUp size={16} className="inline ml-1" />
      : <ChevronDown size={16} className="inline ml-1" />;
  };

  /**
   * Render sortable column header
   */
  const SortableHeader = ({ label, column, className = '' }) => (
    <th 
      onClick={() => handleSort(column)}
      className={`py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-100 transition-colors ${className}`}
    >
      <span className="flex items-center gap-1">
        {label}
        {renderSortIcon(column)}
      </span>
    </th>
  );

  if (loading) {
    return (
      <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm p-8">
        <div className="flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Table Header Info */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
        <p className="text-sm text-gray-600 font-medium">
          Showing <span className="font-bold text-gray-900">{sortedItems.length}</span> items
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          
          {/* Table Header */}
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <SortableHeader label="Item Name" column="item_name" />
              <SortableHeader label="Category" column="category" className="text-center" />
              <SortableHeader label="Stock" column="current_stock" className="text-center" />
              <SortableHeader label="Reorder" column="reorder_point" className="text-center" />
              <SortableHeader label="Usage Rate" column="usage_rate" className="text-center" />
              <SortableHeader label="Status" column="status" className="text-center" />
              <th className="py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wide text-center">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-gray-100">
            {sortedItems.map((item, index) => {
              const status = getStatus(item);
              const categoryColor = getCategoryColor(item.category || 'General');
              const reorderPoint = parseFloat(item.reorder_point) || 0;
              const currentStock = parseFloat(item.current_stock) || 0;
              const daysUntilDepletion = currentStock > 0 ? Math.ceil(currentStock / (parseFloat(item.usage_rate) || 0.05)) : 0;

              return (
                <tr 
                  key={item.id} 
                  className="hover:bg-gray-50 transition-colors group"
                >
                  {/* Item Name */}
                  <td className="py-5 px-6 font-semibold text-gray-900">
                    <div className="flex flex-col">
                      <span>{item.item_name}</span>
                      <span className="text-xs text-gray-500 font-normal">ID: {item.id}</span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-5 px-6 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${categoryColor} rounded-full text-xs font-semibold`}>
                      <Tag size={12} /> {item.category || 'General'}
                    </span>
                  </td>

                  {/* Stock Level */}
                  <td className="py-5 px-6 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`font-bold text-lg ${currentStock <= reorderPoint ? 'text-red-600' : 'text-gray-900'}`}>
                        {currentStock.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500">{item.unit}</span>
                    </div>
                  </td>

                  {/* Reorder Point */}
                  <td className="py-5 px-6 text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-semibold text-gray-700">{reorderPoint.toFixed(2)}</span>
                      <span className="text-xs text-gray-500">{item.unit}</span>
                    </div>
                  </td>

                  {/* Usage Rate */}
                  <td className="py-5 px-6 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-gray-700">
                      <Gauge size={14} className="text-blue-500" />
                      <span className="font-semibold">{(parseFloat(item.usage_rate) || 0).toFixed(2)}</span>
                      <span className="text-xs text-gray-500">/day</span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-5 px-6 text-center">
                    <div className="flex justify-center">
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 ${status.bg} ${status.color} rounded-full text-xs font-bold`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                    {daysUntilDepletion > 0 && currentStock <= reorderPoint && (
                      <p className="text-xs text-gray-500 mt-1.5">
                        ~{daysUntilDepletion} days left
                      </p>
                    )}
                  </td>

                  {/* Action Buttons */}
                  <td className="py-5 px-6 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Record Usage Button */}
                      {onRecordUsage && (
                        <button 
                          onClick={() => onRecordUsage(item.id)}
                          className="p-2 bg-blue-100 hover:bg-blue-500 hover:text-white text-blue-600 rounded-lg transition-all active:scale-95 tooltip"
                          title="Record usage"
                        >
                          <TrendingDown size={16} />
                        </button>
                      )}

                      {/* Edit Button */}
                      <button 
                        onClick={() => onEdit(item)}
                        className="p-2 bg-green-100 hover:bg-green-500 hover:text-white text-green-600 rounded-lg transition-all active:scale-95 tooltip"
                        title="Edit item"
                      >
                        <Edit3 size={16} />
                      </button>

                      {/* Delete Button */}
                      {onDelete && (
                        <button 
                          onClick={() => {
                            if (window.confirm(`Delete "${item.item_name}"?`)) {
                              onDelete(item.id);
                            }
                          }}
                          className="p-2 bg-red-100 hover:bg-red-500 hover:text-white text-red-600 rounded-lg transition-all active:scale-95 tooltip"
                          title="Delete item"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer Info */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Adequate Stock</p>
            <p className="text-lg font-bold text-green-600">
              {sortedItems.filter(item => {
                const status = getStatus(item);
                return status.label === 'Adequate';
              }).length}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Low Stock</p>
            <p className="text-lg font-bold text-yellow-600">
              {sortedItems.filter(item => {
                const status = getStatus(item);
                return status.label === 'Low Stock';
              }).length}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Critical</p>
            <p className="text-lg font-bold text-red-600">
              {sortedItems.filter(item => {
                const status = getStatus(item);
                return status.label === 'Critical' || status.label === 'Out of Stock';
              }).length}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Total Value</p>
            <p className="text-lg font-bold text-gray-900">
              {sortedItems.reduce((sum, item) => sum + (parseFloat(item.current_stock) || 0), 0).toFixed(2)} units
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryTable;