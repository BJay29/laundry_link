import React, { useState, useMemo } from 'react';
import {
  Edit3,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Tag,
  AlertOctagon,
  Trash2,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  PackageOpen
} from 'lucide-react';

/**
 * INVENTORY TABLE
 * Displays inventory items with color-coded status, category tags,
 * usage rates, and interactive action buttons for stock management.
 *
 * Features:
 * - Color-coded status indicators (Critical, Low Stock, Stable, Out of Stock)
 * - Category and unit display
 * - Usage rate PER LOAD display
 * - Sortable columns
 * - Delete and edit actions delegated to parent modals (no browser dialogs)
 * - Empty and loading states
 * - Responsive design matching dashboard aesthetic
 *
 * FIXED (usage_rate semantics): usage_rate was previously displayed as
 * "/day" and used to estimate "~Xd left" (days left), implying automatic
 * daily depletion. There is no such mechanism in the backend — usage_rate
 * is consumption PER LOAD (see booking_controller.create_booking, where
 * quantity = loads × usage_rate, deducted only when an actual booking is
 * created). The label and the remaining-estimate have been corrected to
 * reflect "per load" and "~X loads left" respectively.
 */
const InventoryTable = ({
  items = [],
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

  // Empty state
  if (!items || items.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="p-3 bg-gray-50 rounded-xl">
            <PackageOpen size={24} className="text-gray-300" />
          </div>
          <p className="text-gray-500 font-semibold">No inventory items found</p>
          <p className="text-gray-400 text-sm">Add items to start managing your inventory</p>
        </div>
      </div>
    );
  }

  /**
   * Determine status display based on stock levels.
   * Returns label, color classes, icon, and sort priority.
   */
  const getStatus = (item) => {
    const stock = parseFloat(item?.current_stock) || 0;
    const reorder = parseFloat(item?.reorder_point) || 0;

    if (stock <= 0) {
      return {
        label: 'Out of Stock',
        color: 'text-red-600',
        bg: 'bg-red-50',
        icon: <AlertOctagon size={13} />,
        priority: 3
      };
    } else if (stock <= reorder * 0.5) {
      return {
        label: 'Critical',
        color: 'text-red-600',
        bg: 'bg-red-50',
        icon: <AlertTriangle size={13} />,
        priority: 2
      };
    } else if (stock <= reorder) {
      return {
        label: 'Low Stock',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        icon: <AlertTriangle size={13} />,
        priority: 1
      };
    } else {
      return {
        label: 'Adequate',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        icon: <CheckCircle2 size={13} />,
        priority: 0
      };
    }
  };

  /**
   * Returns a consistent badge color per category name.
   */
  const getCategoryColor = (category) => {
    const map = {
      'General':   'bg-gray-100 text-gray-600',
      'Detergent': 'bg-blue-50 text-blue-600',
      'Softener':  'bg-purple-50 text-purple-600',
      'Packaging': 'bg-orange-50 text-orange-600',
      'Cleaning':  'bg-emerald-50 text-emerald-600',
      'Chemical':  'bg-red-50 text-red-600',
    };
    return map[category] || map['General'];
  };

  /**
   * Toggle sort direction when a column header is clicked.
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
   * Sort items based on the active sort column and direction.
   */
  const sortedItems = useMemo(() => {
    const sorted = [...items];

    sorted.sort((a, b) => {
      let aVal, bVal;

      switch (localSortBy) {
        case 'item_name':
          aVal = (a?.item_name || '').toLowerCase();
          bVal = (b?.item_name || '').toLowerCase();
          break;
        case 'category':
          aVal = (a?.category || 'General').toLowerCase();
          bVal = (b?.category || 'General').toLowerCase();
          break;
        case 'current_stock':
          aVal = parseFloat(a?.current_stock) || 0;
          bVal = parseFloat(b?.current_stock) || 0;
          break;
        case 'usage_rate':
          aVal = parseFloat(a?.usage_rate) || 0;
          bVal = parseFloat(b?.usage_rate) || 0;
          break;
        case 'status':
          aVal = getStatus(a).priority;
          bVal = getStatus(b).priority;
          break;
        default:
          aVal = a?.item_name || '';
          bVal = b?.item_name || '';
      }

      if (aVal < bVal) return localSortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return localSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [items, localSortBy, localSortOrder]);

  /**
   * Renders the sort chevron for the active column.
   */
  const renderSortIcon = (column) => {
    if (localSortBy !== column) return null;
    return localSortOrder === 'asc'
      ? <ChevronUp size={14} className="inline ml-1 opacity-60" />
      : <ChevronDown size={14} className="inline ml-1 opacity-60" />;
  };

  /**
   * Reusable sortable column header.
   */
  const SortableHeader = ({ label, column, className = '' }) => (
    <th
      onClick={() => handleSort(column)}
      className={`py-3.5 px-5 text-xs font-semibold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-600 transition-colors select-none ${className}`}
    >
      <span className="flex items-center gap-1">
        {label}
        {renderSortIcon(column)}
      </span>
    </th>
  );

  // Loading state
  if (loading) {
    return (
      <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500"></div>
          <p className="text-gray-500 text-sm">Loading inventory…</p>
        </div>
      </div>
    );
  }

  // Footer summary counts
  const adequateCount  = sortedItems.filter(i => getStatus(i).label === 'Adequate').length;
  const lowCount       = sortedItems.filter(i => getStatus(i).label === 'Low Stock').length;
  const criticalCount  = sortedItems.filter(i => ['Critical', 'Out of Stock'].includes(getStatus(i).label)).length;
  const totalUnits     = sortedItems.reduce((sum, i) => sum + (parseFloat(i?.current_stock) || 0), 0);

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Row count sub-header */}
      <div className="px-6 py-3.5 border-b border-gray-100 bg-gray-50/60">
        <p className="text-sm text-gray-400 font-medium">
          Showing <span className="font-bold text-gray-700">{sortedItems.length}</span> items
        </p>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">

          {/* Table Header */}
          <thead>
            <tr className="border-b border-gray-100">
              <SortableHeader label="Item Name"   column="item_name" />
              <SortableHeader label="Category"    column="category"       className="text-center" />
              <SortableHeader label="Stock"       column="current_stock"  className="text-center" />
              <SortableHeader label="Reorder"     column="reorder_point"  className="text-center" />
              <SortableHeader label="Usage Rate"  column="usage_rate"     className="text-center" />
              <SortableHeader label="Status"      column="status"         className="text-center" />
              <th className="py-3.5 px-5 text-xs font-semibold text-gray-400 uppercase tracking-widest text-center">
                Actions
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-gray-50">
            {sortedItems.map((item) => {
              const status        = getStatus(item);
              const categoryColor = getCategoryColor(item?.category || 'General');
              const reorderPoint  = parseFloat(item?.reorder_point) || 0;
              const currentStock  = parseFloat(item?.current_stock) || 0;
              const usageRate     = parseFloat(item?.usage_rate) || 0.05;
              // FIXED: usage_rate is consumption PER LOAD, not per day —
              // this now estimates remaining LOADS the current stock can
              // cover, not days. Depletion only happens when an actual
              // booking uses this item, not automatically over time.
              const loadsLeft     = currentStock > 0 && usageRate > 0
                ? Math.floor(currentStock / usageRate)
                : 0;
              const isLow         = currentStock <= reorderPoint;

              return (
                <tr
                  key={item?.id || Math.random()}
                  className="hover:bg-gray-50/70 transition-colors group"
                >

                  {/* Item Name */}
                  <td className="py-4 px-5">
                    <p className="font-semibold text-gray-900 text-sm">{item?.item_name || 'Unnamed Item'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">ID: {item?.id || 'N/A'}</p>
                  </td>

                  {/* Category Badge */}
                  <td className="py-4 px-5 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${categoryColor} rounded-lg text-xs font-semibold`}>
                      <Tag size={11} />
                      {item?.category || 'General'}
                    </span>
                  </td>

                  {/* Stock Level */}
                  <td className="py-4 px-5 text-center">
                    <p className={`font-bold text-base ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                      {currentStock.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">{item?.unit || ''}</p>
                  </td>

                  {/* Reorder Point */}
                  <td className="py-4 px-5 text-center">
                    <p className="font-semibold text-gray-600 text-sm">{reorderPoint.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">{item?.unit || ''}</p>
                  </td>

                  {/* Usage Rate */}
                  <td className="py-4 px-5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Gauge size={13} className="text-emerald-500" />
                      <span className="font-semibold text-gray-700 text-sm">{usageRate.toFixed(2)}</span>
                      <span className="text-xs text-gray-400">/load</span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-4 px-5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${status.bg} ${status.color} rounded-lg text-xs font-bold`}>
                        {status.icon}
                        {status.label}
                      </span>
                      {loadsLeft > 0 && isLow && (
                        <p className="text-xs text-gray-400">~{loadsLeft} loads left</p>
                      )}
                    </div>
                  </td>

                  {/* Action Buttons — all confirmations delegated to parent modals */}
                  <td className="py-4 px-5 text-center">
                    <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">

                      {/* Record Usage — triggers parent usage modal */}
                      {onRecordUsage && (
                        <button
                          onClick={() => onRecordUsage(item?.id, item?.item_name)}
                          className="p-2 bg-blue-50 hover:bg-blue-500 hover:text-white text-blue-500 rounded-lg transition-all active:scale-95"
                          title="Record usage"
                        >
                          <TrendingDown size={15} />
                        </button>
                      )}

                      {/* Edit */}
                      <button
                        onClick={() => onEdit(item)}
                        className="p-2 bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-600 rounded-lg transition-all active:scale-95"
                        title="Edit item"
                      >
                        <Edit3 size={15} />
                      </button>

                      {/* Delete — triggers parent delete confirmation modal */}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item?.id, item?.item_name)}
                          className="p-2 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 rounded-lg transition-all active:scale-95"
                          title="Delete item"
                        >
                          <Trash2 size={15} />
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

      {/* Footer Summary — matches dashboard stat card style */}
      <div className="px-6 py-4 bg-gray-50/60 border-t border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Adequate</p>
              <p className="text-xl font-bold text-emerald-600">{adequateCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <AlertTriangle size={16} className="text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Low Stock</p>
              <p className="text-xl font-bold text-amber-600">{lowCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertOctagon size={16} className="text-red-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Critical</p>
              <p className="text-xl font-bold text-red-600">{criticalCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Gauge size={16} className="text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Total Units</p>
              <p className="text-xl font-bold text-gray-700">{totalUnits.toFixed(1)}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default InventoryTable;