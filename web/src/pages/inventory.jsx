import React, { useState, useEffect } from 'react';
import { apiService } from '../services/APIservices';
import InventoryTable from '../components/ui/inventorytable';
import InventoryModal from '../components/modals/inventorymodal';
import InventoryCharts from '../components/charts/inventorycharts';
import { Search, AlertCircle, RefreshCw, Filter, Trash2, X, CheckCircle, Minus } from 'lucide-react';

/**
 * INVENTORY PAGE
 * Main dashboard for tracking supply levels and managing inventory data.
 * Features:
 * - Real-time inventory tracking
 * - Stock level monitoring with visual indicators
 * - Add, edit, and delete inventory items
 * - Analytics charts for consumption trends
 * - Search and filter functionality
 * - Record item usage via modal input (no browser prompt)
 * - Delete confirmation modal (no browser confirm)
 * - Top-right toast notifications for success messages
 * - Error handling and loading states
 * - Responsive design
 */
const InventoryPage = () => {
  // State Management
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortConfig, setSortConfig] = useState({
    key: 'item_name',
    order: 'asc'
  });

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState({ open: false, itemId: null, itemName: '' });

  // Usage input modal state
  const [usageModal, setUsageModal] = useState({ open: false, itemId: null, itemName: '', quantity: '' });
  const [usageError, setUsageError] = useState('');

  // Auto-dismiss success toast after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  /**
   * Load inventory items from API on component mount
   */
  useEffect(() => {
    loadInventory();
  }, []);

  /**
   * Filter and search items whenever items, searchTerm, or filterStatus changes
   */
  useEffect(() => {
    filterAndSearchItems();
  }, [items, searchTerm, filterStatus]);

  /**
   * Get shop ID from localStorage with fallback
   */
  const getShopId = () => {
    const rawShopId = localStorage.getItem('shop_id');
    return rawShopId ? parseInt(rawShopId, 10) : 1;
  };

  /**
   * Determine item status based on stock levels
   */
  const getItemStatus = (item) => {
    const stock = parseFloat(item?.current_stock) || 0;
    const reorder = parseFloat(item?.reorder_point) || 0;

    if (stock <= 0) return 'OUT_OF_STOCK';
    if (stock <= reorder * 0.5) return 'CRITICAL';
    if (stock <= reorder) return 'LOW';
    return 'ADEQUATE';
  };

  /**
   * Filter items based on search term and status filter
   */
  const filterAndSearchItems = () => {
    let filtered = [...items];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        (item?.item_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item?.category || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(item => getItemStatus(item) === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case 'item_name':
          aValue = (a?.item_name || '').toLowerCase();
          bValue = (b?.item_name || '').toLowerCase();
          break;
        case 'current_stock':
          aValue = parseFloat(a?.current_stock) || 0;
          bValue = parseFloat(b?.current_stock) || 0;
          break;
        case 'category':
          aValue = (a?.category || '').toLowerCase();
          bValue = (b?.category || '').toLowerCase();
          break;
        default:
          aValue = a?.item_name || '';
          bValue = b?.item_name || '';
      }

      if (sortConfig.order === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredItems(filtered);
  };

  /**
   * Load inventory items from API
   */
  const loadInventory = async () => {
    try {
      setLoading(true);
      setError(null);

      const shopId = getShopId();
      const inventory = await apiService.getInventory(shopId);

      // Ensure inventory is an array
      const itemsArray = Array.isArray(inventory) ? inventory : [];
      setItems(itemsArray);
    } catch (err) {
      console.error('Error loading inventory:', err);
      setError('Failed to load inventory. Please try again.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle opening modal for editing an existing item
   */
  const handleEdit = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  /**
   * Handle opening modal for adding a new item
   */
  const handleAdd = () => {
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  /**
   * Open delete confirmation modal instead of using browser confirm
   */
  const handleDelete = (itemId, itemName) => {
    setDeleteModal({ open: true, itemId, itemName: itemName || 'this item' });
  };

  /**
   * Confirm and execute deletion after user confirms in modal
   */
  const confirmDelete = async () => {
    try {
      await apiService.deleteInventoryItem(deleteModal.itemId);
      setDeleteModal({ open: false, itemId: null, itemName: '' });
      setSuccessMessage('Item deleted successfully');
      loadInventory();
    } catch (err) {
      console.error('Error deleting item:', err);
      setDeleteModal({ open: false, itemId: null, itemName: '' });
      setError('Failed to delete item. Please try again.');
    }
  };

  /**
   * Open usage input modal instead of using browser prompt
   */
  const handleRecordUsage = (itemId, itemName) => {
    setUsageModal({ open: true, itemId, itemName: itemName || 'item', quantity: '' });
    setUsageError('');
  };

  /**
   * Confirm and submit usage quantity from the usage modal
   */
  const confirmRecordUsage = async () => {
    const qty = parseFloat(usageModal.quantity);
    if (!usageModal.quantity || isNaN(qty) || qty <= 0) {
      setUsageError('Please enter a valid quantity greater than 0.');
      return;
    }

    try {
      await apiService.recordItemUsage(usageModal.itemId, qty);
      setUsageModal({ open: false, itemId: null, itemName: '', quantity: '' });
      setUsageError('');
      setSuccessMessage('Usage recorded successfully');
      loadInventory();
    } catch (err) {
      console.error('Error recording usage:', err);
      setUsageModal({ open: false, itemId: null, itemName: '', quantity: '' });
      setUsageError('');
      setError('Failed to record usage. Please try again.');
    }
  };

  /**
   * Handle saving (adding or updating) an inventory item
   */
  const handleSave = async (itemId, data) => {
    try {
      setModalLoading(true);
      const shopId = getShopId();

      if (itemId) {
        // Update existing item
        await apiService.updateStock(itemId, data);
        setSuccessMessage('Inventory item updated successfully');
      } else {
        // Add new item
        await apiService.addInventoryItem({ ...data, shop_id: shopId });
        setSuccessMessage('New item added to inventory');
      }

      setIsModalOpen(false);
      setSelectedItem(null);
      loadInventory();
    } catch (err) {
      console.error('Error saving inventory item:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to save item. Please check your connection and try again.';
      setError(errorMessage);
    } finally {
      setModalLoading(false);
    }
  };

  /**
   * Calculate inventory statistics
   */
  const getStats = () => {
    const total = items.length;
    const adequate = items.filter(item => getItemStatus(item) === 'ADEQUATE').length;
    const low = items.filter(item => getItemStatus(item) === 'LOW').length;
    const critical = items.filter(item =>
      ['CRITICAL', 'OUT_OF_STOCK'].includes(getItemStatus(item))
    ).length;

    return { total, adequate, low, critical };
  };

  const stats = getStats();

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Top-right success toast ── */}
      {successMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-white border border-green-200 shadow-lg rounded-xl px-4 py-3 animate-in slide-in-from-right duration-300 max-w-sm">
          <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
          <p className="text-gray-800 font-medium text-sm flex-1">{successMessage}</p>
          <button onClick={() => setSuccessMessage(null)} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-50 rounded-lg">
                <Trash2 size={22} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Item</h3>
                <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-700 text-sm mb-6">
              Are you sure you want to delete <span className="font-semibold text-gray-900">"{deleteModal.itemName}"</span>? This will permanently remove it from your inventory.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, itemId: null, itemName: '' })}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Usage Input Modal ── */}
      {usageModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-50 rounded-lg">
                <Minus size={22} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Record Usage</h3>
                <p className="text-xs text-gray-500 mt-0.5">{usageModal.itemName}</p>
              </div>
            </div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Quantity Used
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={usageModal.quantity}
              onChange={(e) => {
                setUsageModal(prev => ({ ...prev, quantity: e.target.value }));
                setUsageError('');
              }}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none font-medium mb-1"
              placeholder="Enter quantity..."
              autoFocus
            />
            {usageError && (
              <p className="text-sm text-red-600 mb-3">{usageError}</p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setUsageModal({ open: false, itemId: null, itemName: '', quantity: '' }); setUsageError(''); }}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRecordUsage}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Inventory Management
              </h1>
              <p className="text-gray-600 mt-1">
                Track and optimize your laundry supply consumables
              </p>
            </div>
            <button
              onClick={handleAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <span>+</span> Add New Item
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-900 font-semibold">Error</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 flex-shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* Statistics Cards */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-gray-600 text-sm font-medium">Total Items</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-green-200 shadow-sm">
              <p className="text-gray-600 text-sm font-medium">✅ Adequate</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.adequate}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-yellow-200 shadow-sm">
              <p className="text-gray-600 text-sm font-medium">⚠️ Low Stock</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.low}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-red-200 shadow-sm">
              <p className="text-gray-600 text-sm font-medium">🔴 Critical</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{stats.critical}</p>
            </div>
          </div>
        )}

        {/* Inventory Stock Analysis Chart */}
        <InventoryCharts items={items} loading={loading} />

        {/* Search and Filter Section */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search items by name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Filter Dropdown */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="ADEQUATE">✅ Adequate</option>
              <option value="LOW">⚠️ Low Stock</option>
              <option value="CRITICAL">🔴 Critical</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={loadInventory}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>
        </div>

        {/* Inventory Data Table */}
        <div className="mt-8">
          {loading ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p className="text-gray-600">Loading inventory...</p>
              </div>
            </div>
          ) : filteredItems.length > 0 ? (
            <InventoryTable
              items={filteredItems}
              onEdit={handleEdit}
              onDelete={(itemId, itemName) => handleDelete(itemId, itemName)}
              onRecordUsage={(itemId, itemName) => handleRecordUsage(itemId, itemName)}
              loading={false}
              sortBy={sortConfig.key}
              sortOrder={sortConfig.order}
            />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
              <Filter size={32} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 font-semibold">No items found</p>
              <p className="text-gray-500 text-sm mt-1">
                {searchTerm || filterStatus !== 'ALL'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Add your first inventory item to get started'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Inventory Management Modal */}
      {/* key forces a full remount whenever the selected item changes,
          guaranteeing the form state resets correctly for each item */}
      <InventoryModal
        key={selectedItem?.id ?? 'new'}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onSave={handleSave}
        loading={modalLoading}
      />
    </div>
  );
};

export default InventoryPage;
