import axios from 'axios';

/**
 * Base URL for the FastAPI backend.
 * Hosted on Render for production access.
 */
const BASE_URL = 'https://laundrylink-backend-8p1l.onrender.com';

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Request Interceptor:
 * Automatically attaches the JWT Bearer token to every outgoing request
 * to ensure authorized access to protected routes.
 */
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// --- INDIVIDUAL EXPORTS FOR NAMED IMPORTS ---

export const getInventory = async (shopId) => {
    try {
        const targetId = shopId || localStorage.getItem('shop_id');
        const response = await apiClient.get(`/inventory/?shop_id=${targetId}`);
        return response.data;
    } catch (error) {
        console.error("Fetch Inventory Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

/**
 * Fetches inventory grouped by category for booking dropdowns.
 */
export const getInventoryCategories = async (shopId) => {
    try {
        const targetId = shopId || localStorage.getItem('shop_id');
        const response = await apiClient.get(`/inventory/categories?shop_id=${targetId}`);
        return response.data;
    } catch (error) {
        console.error("Fetch Inventory Categories Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

export const addInventoryItem = async (itemData) => {
    try {
        const sanitizedData = {
            ...itemData,
            current_stock: parseFloat(itemData.current_stock || 0),
            reorder_point: parseFloat(itemData.reorder_point || 0),
            usage_rate: parseFloat(itemData.usage_rate || 0.05),
            category: itemData.category || 'General',
            unit: itemData.unit || 'kg',
            shop_id: parseInt(itemData.shop_id || localStorage.getItem('shop_id'))
        };
        const response = await apiClient.post('/inventory/', sanitizedData);
        return response.data;
    } catch (error) {
        console.error("Add Inventory Item Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

export const updateStock = async (itemId, stockData) => {
    try {
        const sanitizedData = {
            item_name: stockData.item_name,
            category: stockData.category,
            unit: stockData.unit,
            current_stock: parseFloat(stockData.current_stock),
            reorder_point: parseFloat(stockData.reorder_point),
            usage_rate: parseFloat(stockData.usage_rate),
            shop_id: stockData.shop_id
        };
        const response = await apiClient.put(`/inventory/${itemId}`, sanitizedData);
        return response.data;
    } catch (error) {
        console.error("Update Stock/Usage Rate Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

export const deleteInventoryItem = async (itemId) => {
    try {
        const response = await apiClient.delete(`/inventory/${itemId}`);
        return response.data;
    } catch (error) {
        console.error("Delete Inventory Item Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

export const recordItemUsage = async (itemId, quantity) => {
    try {
        const response = await apiClient.post(`/inventory/${itemId}/use?quantity=${parseFloat(quantity)}`);
        return response.data;
    } catch (error) {
        console.error("Record Item Usage Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

export const getItemAnalytics = async (itemId, days = 7) => {
    try {
        const response = await apiClient.get(`/inventory/${itemId}/analytics?days=${days}`);
        return response.data;
    } catch (error) {
        console.error("Fetch Item Analytics Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

export const getInventoryDashboardStats = async (shopId) => {
    try {
        const targetId = shopId || localStorage.getItem('shop_id');
        const response = await apiClient.get(`/inventory/shop/${targetId}/alerts`);
        return response.data;
    } catch (error) {
        console.error("Fetch Inventory Dashboard Stats Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

/**
 * Fetches AI model accuracy metrics from the analytics controller.
 */
export const getAiAccuracyMetrics = async () => {
    try {
        const response = await apiClient.get('/analytics/accuracy');
        return response.data;
    } catch (error) {
        console.error("Fetch AI Accuracy Metrics Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

/**
 * Triggers AI model retraining.
 */
export const triggerAiRetraining = async () => {
    try {
        const response = await apiClient.post('/analytics/retrain-model');
        return response.data;
    } catch (error) {
        console.error("Trigger AI Retraining Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

/**
 * Fetches K-Means customer segments from the analytics endpoint.
 * Returns a list of customers each annotated with a behavioral segment
 * (Occasional | Regular | VIP) based on visit frequency and total spending.
 */
export const getCustomerSegments = async () => {
    try {
        const response = await apiClient.get('/analytics/customer-segments');
        return response.data;
    } catch (error) {
        console.error("Fetch Customer Segments Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

/**
 * Updates the shop profile (name, address, email).
 * @param {number|string} shopId - The ID of the shop to update.
 * @param {Object} profileData - The data object containing shop details.
 */
export const updateShopProfile = async (shopId, profileData) => {
    try {
        const response = await apiClient.put(`/settings/${shopId}/profile`, profileData);
        return response.data;
    } catch (error) {
        console.error("Update Shop Profile Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

/**
 * Updates the user password after verifying current credentials.
 * @param {number|string} userId - The ID of the user.
 * @param {Object} passwordData - Object containing old_password and new_password.
 */
export const updatePassword = async (userId, passwordData) => {
    try {
        const response = await apiClient.put(`/settings/user/${userId}/password`, passwordData);
        return response.data;
    } catch (error) {
        console.error("Update Password Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

// --- API SERVICE OBJECT ---

export const apiService = {

    // --- AUTHENTICATION METHODS ---

     login: async (email, password) => {
        try {
            const response = await apiClient.post('/auth/login', { email, password });
            const { user, access_token } = response.data;

            localStorage.setItem('token', access_token);
            localStorage.setItem('user_email', user.email);
            localStorage.setItem('shop_id', user.shop_id);
            localStorage.setItem('shop_name', user.shop_name);
            localStorage.setItem('shop_address', user.address);

            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.detail || error.message;
            console.error("Authentication Error:", errorMessage);
            throw error;
        }
    },

    register: async (shopName, address, email, password) => {
        try {
            const response = await apiClient.post('/auth/register/owner', {
                shop_name: shopName,
                address,
                email,
                password,
            });
            // NOTE: No machine initialization call here on purpose.
            // New shops start with an EMPTY Machine Hub. Units must be
            // registered manually via apiService.addMachine(), which is
            // what populates the Machine Hub for that shop.
            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.detail || error.message;
            console.error("Registration Error:", errorMessage);
            throw error;
        }
    },

    logout: () => {
        localStorage.clear();
        window.location.href = '/login';
    },

    // --- BOOKING & TRANSACTION METHODS ---

    createBooking: async (bookingData) => {
        try {
            const payload = {
                ...bookingData,
                shop_id: bookingData.shop_id ? parseInt(bookingData.shop_id) : parseInt(localStorage.getItem('shop_id')),
                washer_id: bookingData.washer_id ? parseInt(bookingData.washer_id) : null,
                dryer_id: bookingData.dryer_id ? parseInt(bookingData.dryer_id) : null,
                inventory_item_id: bookingData.inventory_item_id ? parseInt(bookingData.inventory_item_id) : null,
                inventory_quantity_used: bookingData.inventory_quantity_used ? parseFloat(bookingData.inventory_quantity_used) : null,
                weight: parseFloat(bookingData.weight || 0),
                loads: parseInt(bookingData.loads || 1),
                total_price: parseFloat(bookingData.total_price || 0),
                add_detergent: Boolean(bookingData.add_detergent),
                add_delivery: Boolean(bookingData.add_delivery),
                is_rush: Boolean(bookingData.is_rush),
                booking_timestamp: bookingData.booking_timestamp
                    ? new Date(bookingData.booking_timestamp).toISOString()
                    : new Date().toISOString()
            };

            const response = await apiClient.post('/bookings/', payload);
            return response.data;
        } catch (error) {
            console.error("Create Booking Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    getActiveBookings: async () => {
        try {
            const response = await apiClient.get('/bookings/active');
            return response.data;
        } catch (error) {
            console.error("Fetch Active Bookings Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    updateBookingStatus: async (bookingId, newStatus) => {
        try {
            const response = await apiClient.patch(`/bookings/${bookingId}/status`, {
                status: newStatus
            });
            return response.data;
        } catch (error) {
            console.error("Update Booking Status Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * Assigns a washer and/or dryer to an existing Pending booking.
     * Called from AssignMachineModal when the operator selects a machine.
     * The backend will validate availability and transition the booking
     * status from Pending to In Progress.
     * @param {number} bookingId - The ID of the Pending booking.
     * @param {{ washer_id: number|null, dryer_id: number|null }} assignData
     * @returns {Promise<BookingResponse>}
     */
    assignMachineToBooking: async (bookingId, assignData) => {
        try {
            const response = await apiClient.patch(
                `/bookings/${bookingId}/assign-machine`,
                assignData
            );
            return response.data;
        } catch (error) {
            console.error("Assign Machine Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    // --- MACHINE HUB & TELEMETRY METHODS ---
    // All routes below require `shop_id` as a query param to match
    // backend/app/routers/machines.py exactly (Query(...) is required
    // on every endpoint except POST / , where shop_id lives in the body).

    /**
     * GET /machines/?shop_id=...
     * Fetches real-time status + overhead metrics for all units of a shop.
     * New shops will simply return an empty array here until units
     * are registered via addMachine().
     */
    getMachines: async (shopId) => {
        try {
            const targetId = shopId || localStorage.getItem('shop_id');
            const response = await apiClient.get('/machines/', {
                params: targetId ? { shop_id: parseInt(targetId) } : {}
            });
            return response.data;
        } catch (error) {
            console.error("Fetch Machines Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * POST /machines/
     * Registers a single new hardware unit (Washer or Dryer) for the shop.
     * This is the primary way the Machine Hub gets populated after
     * registration, since new shops intentionally start empty.
     */
    addMachine: async (machineData) => {
        try {
            const shopId = machineData.shop_id || localStorage.getItem('shop_id');
            const payload = {
                ...machineData,
                shop_id: parseInt(shopId),
                machine_number: parseInt(machineData.machine_number)
            };
            const response = await apiClient.post('/machines/', payload);
            return response.data;
        } catch (error) {
            console.error("Add Machine Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * PATCH /machines/{machine_id}?shop_id=...
     * Updates machine details like Name, Type, or Operational Status.
     */
    updateMachineConfig: async (machineId, updateData, shopId) => {
        try {
            const targetId = shopId || localStorage.getItem('shop_id');
            const response = await apiClient.patch(`/machines/${machineId}`, updateData, {
                params: { shop_id: parseInt(targetId) }
            });
            return response.data;
        } catch (error) {
            console.error("Update Machine Config Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * DELETE /machines/{machine_id}?shop_id=...
     */
    deleteMachine: async (machineId, shopId) => {
        try {
            const targetId = shopId || localStorage.getItem('shop_id');
            const response = await apiClient.delete(`/machines/${machineId}`, {
                params: { shop_id: parseInt(targetId) }
            });
            return response.data;
        } catch (error) {
            console.error("Delete Machine Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * GET /machines/{machine_id}/metrics?shop_id=...
     */
    getMachineMetrics: async (machineId, shopId) => {
        try {
            const targetId = shopId || localStorage.getItem('shop_id');
            const response = await apiClient.get(`/machines/${machineId}/metrics`, {
                params: { shop_id: parseInt(targetId) }
            });
            return response.data;
        } catch (error) {
            console.error("Fetch Machine Metrics Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * PATCH /machines/{machine_id}/maintenance?shop_id=...
     */
    toggleMaintenance: async (machineId, shopId) => {
        try {
            const targetId = shopId || localStorage.getItem('shop_id');
            const response = await apiClient.patch(`/machines/${machineId}/maintenance`, null, {
                params: { shop_id: parseInt(targetId) }
            });
            return response.data;
        } catch (error) {
            console.error("Toggle Maintenance Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * POST /machines/initialize?shop_id=...
     * Bootstraps a standard 6 Washer / 6 Dryer grid for the shop.
     * NOTE: Intentionally NOT called automatically anywhere in this file
     * (e.g. not inside `register`). Call this manually only if the shop
     * owner explicitly opts into the default grid instead of registering
     * units one by one.
     */
    initializeDefaultMachines: async (shopId) => {
        try {
            const targetId = shopId || localStorage.getItem('shop_id');
            const response = await apiClient.post('/machines/initialize', null, {
                params: { shop_id: parseInt(targetId) }
            });
            return response.data;
        } catch (error) {
            console.error("Initialization Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * POST /machines/reset-all?shop_id=...
     * Emergency override to set all shop machines back to 'Available'.
     */
    resetAllMachines: async (shopId) => {
        try {
            const targetId = shopId || localStorage.getItem('shop_id');
            const response = await apiClient.post('/machines/reset-all', null, {
                params: { shop_id: parseInt(targetId) }
            });
            return response.data;
        } catch (error) {
            console.error("Reset All Machines Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    // --- INVENTORY METHODS ---

    getInventory,
    getInventoryCategories,
    addInventoryItem,
    updateStock,
    deleteInventoryItem,
    recordItemUsage,
    getItemAnalytics,
    getInventoryDashboardStats,

    // --- ANALYTICS & INSIGHTS ---

    getDashboardStats: async () => {
        try {
            const response = await apiClient.get('/analytics/dashboard-summary');
            return response.data;
        } catch (error) {
            console.error("Dashboard Stats Fetch Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    getForecastData: async () => {
        try {
            const response = await apiClient.get('/analytics/forecast-graph');
            return response.data;
        } catch (error) {
            console.error("Forecast Data Fetch Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    getServiceDistribution: async () => {
        try {
            const response = await apiClient.get('/analytics/service-distribution');
            return response.data;
        } catch (error) {
            console.error("Service Distribution Fetch Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    getOperationalInsights: async () => {
        try {
            const response = await apiClient.get('/analytics/operational-insights');
            return response.data;
        } catch (error) {
            console.error("Operational Insights Fetch Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    getWeeklyHistory: async () => {
        try {
            const response = await apiClient.get('/analytics/weekly-history');
            return response.data;
        } catch (error) {
            console.error("Weekly History Fetch Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    getAiAccuracyMetrics,
    triggerAiRetraining,

    // ─── CUSTOMER SEGMENTATION ───────────────────────────────────────────────
    // FIX: getCustomerSegments was defined as a standalone export but was
    // missing from the apiService object, causing "apiService.getCustomerSegments
    // is not a function" at runtime. It is now included here so both import
    // styles work:
    //   import apiService from '...'  → apiService.getCustomerSegments()  ✓
    //   import { getCustomerSegments } from '...'  → getCustomerSegments()  ✓
    getCustomerSegments,

    // --- OPTIMIZATION SETTINGS METHODS ---

    getSettings: async (shopId) => {
        try {
            const targetId = shopId || localStorage.getItem('shop_id');
            const response = await apiClient.get(`/settings/${targetId}`);
            return response.data;
        } catch (error) {
            console.error("Fetch Settings Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    updateSettings: async (shopId, settingsData) => {
        try {
            const targetId = shopId || localStorage.getItem('shop_id');
            const sanitizedPayload = {
                ...settingsData,
                full_service_price: settingsData.full_service_price !== undefined ? parseFloat(settingsData.full_service_price) : undefined,
                regular_wash_price: settingsData.regular_wash_price !== undefined ? parseFloat(settingsData.regular_wash_price) : undefined,
                titan_wash_price: settingsData.titan_wash_price !== undefined ? parseFloat(settingsData.titan_wash_price) : undefined,
                comforter_price: settingsData.comforter_price !== undefined ? parseFloat(settingsData.comforter_price) : undefined,
                electricity_rate: settingsData.electricity_rate !== undefined ? parseFloat(settingsData.electricity_rate) : undefined,
                water_rate: settingsData.water_rate !== undefined ? parseFloat(settingsData.water_rate) : undefined,
                detergent_cost_per_load: settingsData.detergent_cost_per_load !== undefined ? parseFloat(settingsData.detergent_cost_per_load) : undefined
            };

            const response = await apiClient.put(`/settings/${targetId}`, sanitizedPayload);
            return response.data;
        } catch (error) {
            console.error("Update Settings Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    getSystemDefaults: async () => {
        try {
            const response = await apiClient.get('/settings/defaults');
            return response.data;
        } catch (error) {
            console.error("Fetch System Defaults Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    resetToDefaults: async (shopId) => {
        try {
            const targetId = shopId || localStorage.getItem('shop_id');
            const response = await apiClient.post(`/settings/${targetId}/reset`);
            return response.data;
        } catch (error) {
            console.error("Reset Settings Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    getBookingPricing: async (shopId) => {
        try {
            const targetId = shopId || localStorage.getItem('shop_id');
            const response = await apiClient.get(`/settings/${targetId}/pricing`);
            return response.data;
        } catch (error) {
            console.error("Fetch Pricing Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    // --- PROFILE & PASSWORD METHODS ---

    updateShopProfile,
    updatePassword,

    // --- UTILS ---

    getShopId: () => localStorage.getItem('shop_id'),
    getAuthHeader: () => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    }
};

export default apiService;