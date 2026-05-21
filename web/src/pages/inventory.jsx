import React, { useState, useEffect } from 'react';
import { apiService } from '../services/APIservices';
import InventoryTable from '../components/ui/inventorytable';
import InventoryModal from '../components/modals/inventorymodal';

/**
 * INVENTORY PAGE
 * Main dashboard for tracking supply levels and managing inventory data.
 * Supports updating stock levels and configuring usage rates per item.
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
            } else {
                // Add new item
                const shopId = localStorage.getItem('shop_id');
                await apiService.addInventoryItem({ ...data, shop_id: parseInt(shopId) });
            }
            setIsModalOpen(false);
            loadInventory(); // Refresh list after a successful action
        } catch (error) {
            console.error("Error saving inventory item:", error);
        }
    };

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inventory Management</h1>
                        <p className="text-slate-500 font-medium">Track and optimize your laundry supply consumables.</p>
                    </div>
                    <button 
                        onClick={handleAdd}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        + Add New Item
                    </button>
                </div>

                {/* Main Inventory Data Table */}
                <InventoryTable 
                    items={items} 
                    onEdit={handleEdit} 
                />

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