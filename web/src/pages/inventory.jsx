import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiservice';
import InventoryTable from '../components/ui/inventorytable';
import InventoryModal from '../components/modals/inventorymodal';

/**
 * INVENTORY PAGE
 * Main dashboard for tracking supply levels and managing inventory data.
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
            // Using a dynamic shop_id from localStorage with a fallback
            const shopId = localStorage.getItem('shop_id') || 1;
            const inventory = await apiService.getInventory(shopId);
            
            // Log for debugging: ensures we receive data correctly
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

    const handleSave = async (item_id, data) => {
        try {
            await apiService.updateStock(item_id, data);
            setIsModalOpen(false);
            loadInventory(); // Refresh list after a successful update
        } catch (error) {
            console.error("Error updating stock:", error);
        }
    };

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inventory Management</h1>
                    <p className="text-slate-500 font-medium">Track and optimize your laundry supply consumables.</p>
                </div>

                {/* Main Inventory Data Table */}
                <InventoryTable 
                    items={items} 
                    onEdit={handleEdit} 
                />

                {/* Stock Update Modal */}
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