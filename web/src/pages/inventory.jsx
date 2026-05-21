import React, { useState, useEffect } from 'react';
import { apiService } from '../services/APIservices';
import InventoryTable from '../components/ui/inventorytable';
import InventoryModal from '../components/modals/inventorymodal';
import InventoryCharts from '../components/charts/inventorycharts';
import { toast, Toaster } from 'react-hot-toast'; // Import react-hot-toast

/**
 * INVENTORY PAGE
 * Main dashboard for tracking supply levels and managing inventory data.
 * Supports updating stock levels, viewing analytics, and managing items.
 */
const InventoryPage = () => {
    const [items, setItems] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    useEffect(() => {
        loadInventory();
    }, []);

    const loadInventory = async () => {
        try {
            const shopId = localStorage.getItem('shop_id') || 1;
            const inventory = await apiService.getInventory(shopId);
            
            console.log("Fetched Inventory Data:", inventory);
            
            setItems(Array.isArray(inventory) ? inventory : []);
        } catch (error) {
            console.error("Error loading inventory:", error);
            setItems([]);
        }
    };

    const handleEdit = (item) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setSelectedItem(null); // Clear selection for new item mode
        setIsModalOpen(true);
    };

    const handleSave = async (item_id, data) => {
        try {
            if (item_id) {
                // Update existing item
                await apiService.updateStock(item_id, data);
                toast.success("Inventory item updated successfully!");
            } else {
                // Add new item
                const shopId = localStorage.getItem('shop_id') || 1;
                await apiService.addInventoryItem({ ...data, shop_id: parseInt(shopId) });
                toast.success("New item added to inventory!");
            }
            
            setIsModalOpen(false);
            loadInventory(); // Refresh list after a successful action
        } catch (error) {
            console.error("Error saving inventory item:", error);
            toast.error("Failed to save item. Please check your connection.");
        }
    };

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            {/* Toast Notifications Container */}
            <Toaster position="top-right" reverseOrder={false} />

            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inventory Management</h1>
                        <p className="text-slate-500 font-medium">Track and optimize your laundry supply consumables.</p>
                    </div>
                    <button 
                        onClick={handleAdd}
                        className="bg-violet-600 hover:bg-violet-700 text-white font-black py-3 px-6 rounded-2xl transition-all shadow-lg shadow-violet-500/25 active:scale-95"
                    >
                        + Add New Item
                    </button>
                </div>

                {/* Inventory Stock Analysis Chart */}
                <InventoryCharts items={items} />

                {/* Main Inventory Data Table */}
                <div className="mt-8">
                    <InventoryTable 
                        items={items} 
                        onEdit={handleEdit} 
                    />
                </div>

                {/* Inventory Management Modal */}
                <InventoryModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    item={selectedItem}
                    onSave={handleSave}
                />
            </div>
        </div>
    );
};

export default InventoryPage;