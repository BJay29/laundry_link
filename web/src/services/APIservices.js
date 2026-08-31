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

/**
 * FIXED: no longer sends ?shop_id=... — inventory_routes.py now derives
 * shop_id from the JWT via Depends(get_current_user). shopId param kept
 * only so existing call sites don't break; it's unused.
 */
export const getInventory = async (shopId) => {
    try {
        const response = await apiClient.get('/inventory/');
        return response.data;
    } catch (error) {
        console.error("Fetch Inventory Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

/**
 * Fetches inventory grouped by category for booking dropdowns.
 * FIXED: same as getInventory — shop_id comes from the JWT now.
 */
export const getInventoryCategories = async (shopId) => {
    try {
        const response = await apiClient.get('/inventory/categories');
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

/**
 * FIXED: was calling /inventory/shop/{targetId}/alerts, which no longer
 * exists — inventory_routes.py now serves this at /inventory/alerts with
 * no shop path param, deriving shop_id from the JWT.
 */
export const getInventoryDashboardStats = async (shopId) => {
    try {
        const response = await apiClient.get('/inventory/alerts');
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
 * FIXED: was PUT /settings/{shopId}/profile — setting_routes.py now
 * serves this at PUT /settings/profile with no path param; shop_id
 * comes from the JWT. shopId param kept only so existing call sites
 * don't break; it's unused.
 * @param {number|string} shopId - unused, kept for call-site compatibility.
 * @param {Object} profileData - The data object containing shop details.
 */
export const updateShopProfile = async (shopId, profileData) => {
    try {
        const response = await apiClient.put('/settings/profile', profileData);
        return response.data;
    } catch (error) {
        console.error("Update Shop Profile Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

/**
 * Updates the user password after verifying current credentials.
 * FIXED: was PUT /settings/user/{userId}/password — setting_routes.py
 * now serves this at PUT /settings/password, always targeting the
 * CURRENTLY LOGGED-IN user from the JWT (self-only). userId param kept
 * only so existing call sites don't break; it's unused.
 * @param {number|string} userId - unused, kept for call-site compatibility.
 * @param {Object} passwordData - Object containing old_password and new_password.
 */
export const updatePassword = async (userId, passwordData) => {
    try {
        const response = await apiClient.put('/settings/password', passwordData);
        return response.data;
    } catch (error) {
        console.error("Update Password Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

/**
 * NEW — Creates a staff/manager account under the currently logged-in
 * Owner's own shop. Backend endpoint POST /auth/register/staff is
 * Owner-only (enforced via require_role("owner")); shop_id is derived
 * server-side from the Owner's own JWT, never sent from the client.
 * @param {Object} staffData - { full_name, email, password, role }
 *   role must be "staff" or "manager".
 */
export const registerStaff = async (staffData) => {
    try {
        const payload = {
            full_name: staffData.full_name,
            email: staffData.email,
            password: staffData.password,
            role: staffData.role || 'staff',
        };
        const response = await apiClient.post('/auth/register/staff', payload);
        return response.data;
    } catch (error) {
        console.error("Register Staff Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

/**
 * NEW — Fetches recent Activity Log entries for the logged-in user's own
 * shop. Backend endpoint GET /activity-logs/ is restricted to Owner and
 * Manager roles (enforced via require_role("owner", "manager")); a
 * Staff-role JWT will get a 403 even with a valid token.
 * @param {number} limit - max entries to return (default 100, backend caps at 500).
 */
export const getActivityLogs = async (limit = 100) => {
    try {
        const response = await apiClient.get('/activity-logs/', {
            params: { limit }
        });
        return response.data;
    } catch (error) {
        console.error("Fetch Activity Logs Error:", error.response?.data?.detail || error.message);
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
            // NEW — role is needed on the frontend for conditional rendering
            // (e.g. hiding the Staff Management tab and Activity Log nav
            // item from Staff-role accounts). Mirrors what's already
            // embedded in the JWT itself, just cached for quick UI checks
            // without needing to decode the token client-side.
            localStorage.setItem('role', user.role);

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

    // NEW — see standalone export above for full docs.
    registerStaff,

    logout: () => {
        localStorage.clear();
        window.location.href = '/login';
    },

    // --- BOOKING & TRANSACTION METHODS ---

    /**
     * FIXED (MULTI-ITEM INVENTORY): booking_data.inventory_item_id /
     * inventory_quantity_used ay pinalitan na ng booking_data.inventory_items
     * — isang LISTAHAN ng { inventory_item_id, quantity_used } pairs, para
     * masuportahan ang maraming consumables (hal. detergent + fabric
     * conditioner) sa iisang booking. Tumutugma ito sa bagong
     * BookingCreate.inventory_items sa backend schemas.py.
     *
     * bookingData.inventory_items dapat isang array na na mula sa Booking
     * Modal, hal.:
     *   [{ inventory_item_id: 9, quantity_used: 150 },
     *    { inventory_item_id: 12, quantity_used: 90 }]
     * Kung walang consumable na ginamit (hal. walk-in na may sariling
     * sabon), pwedeng iwanang blangko ([]) o hindi isama sa bookingData.
     */
    createBooking: async (bookingData) => {
        try {
            const payload = {
                ...bookingData,
                shop_id: bookingData.shop_id ? parseInt(bookingData.shop_id) : parseInt(localStorage.getItem('shop_id')),
                washer_id: bookingData.washer_id ? parseInt(bookingData.washer_id) : null,
                dryer_id: bookingData.dryer_id ? parseInt(bookingData.dryer_id) : null,
                inventory_items: Array.isArray(bookingData.inventory_items)
                    ? bookingData.inventory_items.map((item) => ({
                          inventory_item_id: parseInt(item.inventory_item_id),
                          quantity_used: parseFloat(item.quantity_used),
                      }))
                    : [],
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
            // Tinanggal ang lumang inventory_item_id / inventory_quantity_used
            // fields kung sakaling naipasa pa rin ng caller — hindi na ito
            // kinikilala ng bagong backend schema.
            delete payload.inventory_item_id;
            delete payload.inventory_quantity_used;

            const response = await apiClient.post('/bookings/', payload);
            return response.data;
        } catch (error) {
            console.error("Create Booking Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * FIXED: was GET /bookings/active?shop_id=... — booking_routes.py no
     * longer accepts a shop_id query param; it derives shop_id from the JWT.
     */
   getActiveBookings: async (shopId) => {
        try {
            const response = await apiClient.get('/bookings/active');
            return response.data;
        } catch (error) {
            console.error("Fetch Active Bookings Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * FIXED: was PATCH /bookings/{id}/status?shop_id=... — no more
     * shop_id query param needed; derived from the JWT.
     */
    updateBookingStatus: async (bookingId, newStatus, shopId) => {
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
     * FIXED: was PATCH /bookings/{id}/assign-machine?shop_id=... — no
     * more shop_id query param needed; derived from the JWT.
     */
    assignMachineToBooking: async (bookingId, assignData, shopId) => {
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
    // FIXED: machine_routes.py no longer requires `shop_id` as a query
    // param on any endpoint — shop_id is derived from the JWT via
    // Depends(get_current_user). shopId params below are kept only so
    // existing call sites don't break; they are unused.

    /**
     * GET /machines/
     * Fetches real-time status + overhead metrics for all units of a shop.
     * New shops will simply return an empty array here until units
     * are registered via addMachine().
     */
    getMachines: async (shopId) => {
        try {
            const response = await apiClient.get('/machines/');
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
     * PATCH /machines/{machine_id}
     * Updates machine details like Name, Type, or Operational Status.
     */
    updateMachineConfig: async (machineId, updateData, shopId) => {
        try {
            const response = await apiClient.patch(`/machines/${machineId}`, updateData);
            return response.data;
        } catch (error) {
            console.error("Update Machine Config Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * DELETE /machines/{machine_id}
     */
    deleteMachine: async (machineId, shopId) => {
        try {
            const response = await apiClient.delete(`/machines/${machineId}`);
            return response.data;
        } catch (error) {
            console.error("Delete Machine Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * GET /machines/{machine_id}/metrics
     */
    getMachineMetrics: async (machineId, shopId) => {
        try {
            const response = await apiClient.get(`/machines/${machineId}/metrics`);
            return response.data;
        } catch (error) {
            console.error("Fetch Machine Metrics Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * PATCH /machines/{machine_id}/maintenance
     */
    toggleMaintenance: async (machineId, shopId) => {
        try {
            const response = await apiClient.patch(`/machines/${machineId}/maintenance`);
            return response.data;
        } catch (error) {
            console.error("Toggle Maintenance Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * POST /machines/initialize
     * Bootstraps a standard 6 Washer / 6 Dryer grid for the shop.
     * NOTE: Intentionally NOT called automatically anywhere in this file
     * (e.g. not inside `register`). Call this manually only if the shop
     * owner explicitly opts into the default grid instead of registering
     * units one by one.
     */
    initializeDefaultMachines: async (shopId) => {
        try {
            const response = await apiClient.post('/machines/initialize');
            return response.data;
        } catch (error) {
            console.error("Initialization Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * POST /machines/reset-all
     * Emergency override to set all shop machines back to 'Available'.
     */
    resetAllMachines: async (shopId) => {
        try {
            const response = await apiClient.post('/machines/reset-all');
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
    // FIXED: setting_routes.py no longer takes shop_id in the URL path —
    // it's derived from the JWT. shopId params below are kept only so
    // existing call sites don't break; they are unused.

    getSettings: async (shopId) => {
        try {
            const response = await apiClient.get('/settings/');
            return response.data;
        } catch (error) {
            console.error("Fetch Settings Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    updateSettings: async (shopId, settingsData) => {
        try {
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

            const response = await apiClient.put('/settings/', sanitizedPayload);
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
            const response = await apiClient.post('/settings/reset');
            return response.data;
        } catch (error) {
            console.error("Reset Settings Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    getBookingPricing: async (shopId) => {
        try {
            const response = await apiClient.get('/settings/pricing');
            return response.data;
        } catch (error) {
            console.error("Fetch Pricing Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    // --- SERVICE TYPE METHODS ---
    // Shop-defined services replace the old fixed Full Service / Regular
    // Wash / Titan Wash / Comforter pricing. Owners add their own services
    // and prices here; these populate the Booking Modal's Service Type
    // dropdown via getBookingPricing().
    // FIXED: no longer takes shop_id in the URL path — derived from the JWT.

    /**
     * GET /settings/services
     * Lists all services (active and inactive) configured for the shop.
     * Returns an empty array for a brand-new shop.
     */
    getServiceTypes: async (shopId) => {
        try {
            const response = await apiClient.get('/settings/services');
            return response.data;
        } catch (error) {
            console.error("Fetch Service Types Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * POST /settings/services
     * Adds a new service (name + price + duration_minutes) to the shop's catalog.
     */
    addServiceType: async (serviceData, shopId) => {
        try {
            const payload = {
                name: serviceData.name,
                price: parseFloat(serviceData.price),
                is_active: serviceData.is_active !== undefined ? Boolean(serviceData.is_active) : true,
                duration_minutes: serviceData.duration_minutes !== undefined
                    ? parseInt(serviceData.duration_minutes)
                    : 45,
            };
            const response = await apiClient.post('/settings/services', payload);
            return response.data;
        } catch (error) {
            console.error("Add Service Type Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * PUT /settings/services/{service_id}
     * Edits an existing service's name, price, active status, or duration.
     */
    updateServiceType: async (serviceId, updateData, shopId) => {
        try {
            const payload = { ...updateData };
            if (payload.price !== undefined) payload.price = parseFloat(payload.price);
            if (payload.duration_minutes !== undefined) payload.duration_minutes = parseInt(payload.duration_minutes);
            const response = await apiClient.put(`/settings/services/${serviceId}`, payload);
            return response.data;
        } catch (error) {
            console.error("Update Service Type Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * DELETE /settings/services/{service_id}
     * Permanently removes a service from the shop's catalog.
     */
    deleteServiceType: async (serviceId, shopId) => {
        try {
            const response = await apiClient.delete(`/settings/services/${serviceId}`);
            return response.data;
        } catch (error) {
            console.error("Delete Service Type Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    // --- PROFILE & PASSWORD METHODS ---

    updateShopProfile,
    updatePassword,

    // --- ACTIVITY LOG METHODS (NEW) ---

    getActivityLogs,

    // --- UTILS ---

    getShopId: () => localStorage.getItem('shop_id'),
    /**
     * NEW — Reads the cached role from localStorage (set during login).
     * Used for conditional UI rendering: hiding the Staff Management tab
     * and Activity Log nav item from Staff-role accounts. This is a UX
     * convenience only — actual authorization is always enforced by the
     * backend via require_role(), regardless of what the frontend shows.
     */
    getRole: () => localStorage.getItem('role'),
    getAuthHeader: () => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    }
};

export default apiService;