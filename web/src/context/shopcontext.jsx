import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * ShopContext
 * Provides global access to the current shop's metadata and authentication status.
 * Syncs with localStorage to persist data across page refreshes.
 */
const ShopContext = createContext();

export const ShopProvider = ({ children }) => {
    const [shopData, setShopData] = useState({
        shopId: localStorage.getItem('shop_id') || null,
        shopName: localStorage.getItem('shop_name') || '',
        shopAddress: localStorage.getItem('shop_address') || '',
        ownerEmail: localStorage.getItem('user_email') || '',
        isAuthenticated: !!localStorage.getItem('token')
    });

    const [isLoading, setIsLoading] = useState(true);

    /**
     * Updates the global shop state and persists to localStorage.
     * Use this during login or when shop settings are modified.
     */
    const updateShop = (newData) => {
        // 1. Update localStorage for persistence
        if (newData.shopId) localStorage.setItem('shop_id', newData.shopId);
        if (newData.shopName) localStorage.setItem('shop_name', newData.shopName);
        if (newData.shopAddress) localStorage.setItem('shop_address', newData.shopAddress);
        if (newData.ownerEmail) localStorage.setItem('user_email', newData.ownerEmail);
        
        // 2. Update React State
        setShopData(prev => ({
            ...prev,
            ...newData,
            isAuthenticated: true
        }));
    };

    /**
     * Clears the context state and removes items from localStorage.
     * Should be called alongside apiService.logout().
     */
    const clearShop = () => {
        const keysToRemove = ['token', 'shop_id', 'shop_name', 'shop_address', 'user_email'];
        keysToRemove.forEach(key => localStorage.removeItem(key));

        setShopData({
            shopId: null,
            shopName: '',
            shopAddress: '',
            ownerEmail: '',
            isAuthenticated: false
        });
    };

    // Initialize/Sync effect
    useEffect(() => {
        const verifyAuth = () => {
            const token = localStorage.getItem('token');
            if (!token) {
                clearShop();
            }
            setIsLoading(false);
        };

        verifyAuth();

        // Listen for storage changes (handles logout in other tabs)
        const handleStorageChange = (e) => {
            if (e.key === 'token' && !e.newValue) {
                clearShop();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    return (
        <ShopContext.Provider value={{ shopData, updateShop, clearShop, isLoading }}>
            {children}
        </ShopContext.Provider>
    );
};

/**
 * Custom hook for easy access to ShopContext.
 * Example: const { shopData, updateShop } = useShop();
 */
export const useShop = () => {
    const context = useContext(ShopContext);
    if (!context) {
        throw new Error('useShop must be used within a ShopProvider');
    }
    return context;
};

export default ShopContext;