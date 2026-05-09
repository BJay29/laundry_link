import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/APIservices';

/**
 * SHOP CONTEXT
 * Provides global access to shop metadata and session authentication status.
 * Synchronizes with localStorage to ensure state persistence across refreshes and tabs.
 */
const ShopContext = createContext();

export const ShopProvider = ({ children }) => {
    // Initialize state from localStorage for immediate UI availability during hydration
    const [shopData, setShopData] = useState({
        shopId: localStorage.getItem('shop_id') || null,
        shopName: localStorage.getItem('shop_name') || '',
        shopAddress: localStorage.getItem('shop_address') || '',
        ownerEmail: localStorage.getItem('user_email') || '',
        isAuthenticated: !!localStorage.getItem('token')
    });

    const [isLoading, setIsLoading] = useState(true);

    /**
     * PERSISTENCE HANDLER: updateShop
     * Synchronizes new metadata into both the React state and localStorage.
     * @param {Object} newData - Object containing updated fields (shopId, shopName, etc.)
     */
    const updateShop = (newData) => {
        // 1. Atomically update localStorage based on provided keys
        if (newData.shopId) localStorage.setItem('shop_id', newData.shopId);
        if (newData.shopName) localStorage.setItem('shop_name', newData.shopName);
        if (newData.shopAddress) localStorage.setItem('shop_address', newData.shopAddress);
        if (newData.ownerEmail) localStorage.setItem('user_email', newData.ownerEmail);
        if (newData.token) localStorage.setItem('token', newData.token);
        
        // 2. Refresh React state to propagate changes to the component tree
        setShopData(prev => {
            const updated = {
                ...prev,
                ...newData,
                // Recalculate authentication based on token presence
                isAuthenticated: !!(newData.token || localStorage.getItem('token'))
            };
            return updated;
        });
    };

    /**
     * LOGOUT HANDLER: clearShop
     * Purges all security credentials and shop metadata from the client.
     */
    const clearShop = useCallback(() => {
        const securityKeys = ['token', 'shop_id', 'shop_name', 'shop_address', 'user_email'];
        securityKeys.forEach(key => localStorage.removeItem(key));

        setShopData({
            shopId: null,
            shopName: '',
            shopAddress: '',
            ownerEmail: '',
            isAuthenticated: false
        });
    }, []);

    /**
     * DATA SYNCHRONIZATION: reloadShopData
     * Fetches the latest profile from the backend to ensure the UI matches the DB.
     * Useful after updating Optimization Settings or Shop Profile info.
     */
    const reloadShopData = useCallback(async () => {
        const id = localStorage.getItem('shop_id');
        if (!id) {
            setIsLoading(false);
            return;
        }

        try {
            const freshData = await apiService.getShopProfile(id);
            if (freshData) {
                updateShop({
                    shopId: freshData.id,
                    shopName: freshData.shop_name,
                    shopAddress: freshData.address,
                    ownerEmail: freshData.owner_email
                });
            }
        } catch (error) {
            console.error("Critical Sync Error: Failed to fetch shop profile:", error);
            // If the server returns Unauthorized, clear the session
            if (error.response?.status === 401) {
                clearShop();
            }
        } finally {
            setIsLoading(false);
        }
    }, [clearShop]);

    /**
     * INITIALIZATION & CROSS-TAB SYNC EFFECT
     * Handles initial authentication verification and listens for storage events
     * to keep multiple browser tabs in sync.
     */
    useEffect(() => {
        const verifySession = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                clearShop();
                setIsLoading(false);
            } else {
                // Background refresh of shop metadata
                await reloadShopData();
            }
        };

        verifySession();

        /**
         * Event Listener: storage
         * Triggers when localStorage is modified in a different tab.
         */
        const handleStorageChange = (e) => {
            // Logout logic: if token is purged in Tab A, Tab B must log out
            if (e.key === 'token' && !e.newValue) {
                clearShop();
            }
            
            // Metadata sync: if Shop Name is updated in Tab A, Tab B must reflect it
            const keyMappings = {
                'shop_name': 'shopName',
                'shop_address': 'shopAddress',
                'user_email': 'ownerEmail'
            };

            if (keyMappings[e.key]) {
                setShopData(prev => ({ 
                    ...prev, 
                    [keyMappings[e.key]]: e.newValue 
                }));
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [reloadShopData, clearShop]);

    return (
        <ShopContext.Provider value={{ 
            shopData, 
            updateShop, 
            clearShop, 
            reloadShopData, 
            isLoading 
        }}>
            {children}
        </ShopContext.Provider>
    );
};

/**
 * HOOK: useShop
 * Standardized hook to consume ShopContext data and methods.
 */
export const useShop = () => {
    const context = useContext(ShopContext);
    if (!context) {
        throw new Error('useShop must be used within a ShopProvider structure');
    }
    return context;
};

export default ShopContext;