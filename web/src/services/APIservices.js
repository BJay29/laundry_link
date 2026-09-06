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
        const response = await apiClient.get('/inventory/');
        return response.data;
    } catch (error) {
        console.error("Fetch Inventory Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

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

export const getInventoryDashboardStats = async (shopId) => {
    try {
        const response = await apiClient.get('/inventory/alerts');
        return response.data;
    } catch (error) {
        console.error("Fetch Inventory Dashboard Stats Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

export const getAiAccuracyMetrics = async () => {
    try {
        const response = await apiClient.get('/analytics/accuracy');
        return response.data;
    } catch (error) {
        console.error("Fetch AI Accuracy Metrics Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

export const triggerAiRetraining = async () => {
    try {
        const response = await apiClient.post('/analytics/retrain-model');
        return response.data;
    } catch (error) {
        console.error("Trigger AI Retraining Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

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
 * GET /analytics/sales-summary
 * NEW — Fetches Today / This Week / This Month total income.
 * Backs the KPI cards on the Record Sales page.
 */
export const getSalesSummary = async () => {
    try {
        const response = await apiClient.get('/analytics/sales-summary');
        return response.data;
    } catch (error) {
        console.error("Fetch Sales Summary Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

/**
 * GET /bookings/all
 * NEW — Fetches every booking for this shop, any status, most recent
 * first. Backs the bookings table on the Record Sales page.
 */
export const getAllBookings = async () => {
    try {
        const response = await apiClient.get('/bookings/all');
        return response.data;
    } catch (error) {
        console.error("Fetch All Bookings Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

/**
 * Fetches the logged-in user's own shop profile, including
 * delivery settings (has_delivery, delivery_fee). Backend endpoint
 * GET /settings/profile.
 */
export const getShopProfile = async () => {
    try {
        const response = await apiClient.get('/settings/profile');
        return response.data;
    } catch (error) {
        console.error("Fetch Shop Profile Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

export const updateShopProfile = async (shopId, profileData) => {
    try {
        const response = await apiClient.put('/settings/profile', profileData);
        return response.data;
    } catch (error) {
        console.error("Update Shop Profile Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

export const updatePassword = async (userId, passwordData) => {
    try {
        const response = await apiClient.put('/settings/password', passwordData);
        return response.data;
    } catch (error) {
        console.error("Update Password Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

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

/**
 * GET /bookings/awaiting-approval
 * Fetches customer-submitted bookings still awaiting Accept/Decline.
 * Used by the Service Terminal's notification bell.
 */
export const getAwaitingApprovalBookings = async () => {
    try {
        const response = await apiClient.get('/bookings/awaiting-approval');
        return response.data;
    } catch (error) {
        console.error("Fetch Awaiting Approval Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

/**
 * PATCH /bookings/{id}/accept
 * Accepts a customer-submitted booking request — moves it to "Pending".
 */
export const acceptBooking = async (bookingId) => {
    try {
        const response = await apiClient.patch(`/bookings/${bookingId}/accept`);
        return response.data;
    } catch (error) {
        console.error("Accept Booking Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

/**
 * PATCH /bookings/{id}/decline
 * Declines a customer-submitted booking request — moves it to "Declined".
 *
 * UPDATED: now REQUIRES a `reason` string in the request body (backend's
 * BookingDeclineRequest schema validates it's non-empty, max 300 chars).
 * The Service Terminal's decline UI offers quick presets ("Fully
 * booked", "Closed for the day", "Service unavailable") plus a free-text
 * option — whichever the staff picks/types is what gets sent here.
 */
export const declineBooking = async (bookingId, reason) => {
    try {
        const response = await apiClient.patch(`/bookings/${bookingId}/decline`, { reason });
        return response.data;
    } catch (error) {
        console.error("Decline Booking Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

// --- ADD-ON METHODS ---
// Mirrors the Service Type methods pattern below — shop owner-defined
// add-ons (fabric softener upgrade, rush, atbp.) shown as a checklist
// in the mobile app's booking flow.

/**
 * GET /addons/
 * Lists all add-ons (active and inactive) configured for the shop.
 */
export const getAddOns = async () => {
    try {
        const response = await apiClient.get('/addons/');
        return response.data;
    } catch (error) {
        console.error("Fetch Add-Ons Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

/**
 * POST /addons/
 * Adds a new add-on (name + price) to the shop's catalog.
 */
export const addAddOn = async (addOnData) => {
    try {
        const payload = {
            name: addOnData.name,
            price: parseFloat(addOnData.price),
            is_active: addOnData.is_active !== undefined ? Boolean(addOnData.is_active) : true,
        };
        const response = await apiClient.post('/addons/', payload);
        return response.data;
    } catch (error) {
        console.error("Add Add-On Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

/**
 * PUT /addons/{addon_id}
 * Edits an existing add-on's name, price, or active status.
 */
export const updateAddOn = async (addOnId, updateData) => {
    try {
        const payload = { ...updateData };
        if (payload.price !== undefined) payload.price = parseFloat(payload.price);
        const response = await apiClient.put(`/addons/${addOnId}`, payload);
        return response.data;
    } catch (error) {
        console.error("Update Add-On Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

/**
 * DELETE /addons/{addon_id}
 */
export const deleteAddOn = async (addOnId) => {
    try {
        const response = await apiClient.delete(`/addons/${addOnId}`);
        return response.data;
    } catch (error) {
        console.error("Delete Add-On Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

// --- PROMO CODE METHODS ---

/**
 * GET /promo-codes/
 * Lists all promo codes (active and inactive) configured for the shop.
 */
export const getPromoCodes = async () => {
    try {
        const response = await apiClient.get('/promo-codes/');
        return response.data;
    } catch (error) {
        console.error("Fetch Promo Codes Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

/**
 * POST /promo-codes/
 * Adds a new promo/discount code to the shop.
 */
export const addPromoCode = async (promoData) => {
    try {
        const payload = {
            code: promoData.code,
            discount_type: promoData.discount_type || 'percent',
            discount_value: parseFloat(promoData.discount_value),
            is_active: promoData.is_active !== undefined ? Boolean(promoData.is_active) : true,
            max_uses: promoData.max_uses ? parseInt(promoData.max_uses) : null,
            expires_at: promoData.expires_at || null,
        };
        const response = await apiClient.post('/promo-codes/', payload);
        return response.data;
    } catch (error) {
        console.error("Add Promo Code Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

/**
 * PUT /promo-codes/{promo_id}
 * Edits an existing promo code's details.
 */
export const updatePromoCode = async (promoId, updateData) => {
    try {
        const payload = { ...updateData };
        if (payload.discount_value !== undefined) payload.discount_value = parseFloat(payload.discount_value);
        if (payload.max_uses !== undefined) payload.max_uses = payload.max_uses ? parseInt(payload.max_uses) : null;
        const response = await apiClient.put(`/promo-codes/${promoId}`, payload);
        return response.data;
    } catch (error) {
        console.error("Update Promo Code Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

/**
 * DELETE /promo-codes/{promo_id}
 */
export const deletePromoCode = async (promoId) => {
    try {
        const response = await apiClient.delete(`/promo-codes/${promoId}`);
        return response.data;
    } catch (error) {
        console.error("Delete Promo Code Error:", error.response?.data?.detail || error.message);
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
            localStorage.setItem('role', user.role);
            localStorage.setItem('full_name', user.full_name || '');

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
            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.detail || error.message;
            console.error("Registration Error:", errorMessage);
            throw error;
        }
    },
    

    registerStaff,

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
            delete payload.inventory_item_id;
            delete payload.inventory_quantity_used;

            const response = await apiClient.post('/bookings/', payload);
            return response.data;
        } catch (error) {
            console.error("Create Booking Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

   getActiveBookings: async (shopId) => {
        try {
            const response = await apiClient.get('/bookings/active');
            return response.data;
        } catch (error) {
            console.error("Fetch Active Bookings Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

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

    getMachines: async (shopId) => {
        try {
            const response = await apiClient.get('/machines/');
            return response.data;
        } catch (error) {
            console.error("Fetch Machines Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

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

    updateMachineConfig: async (machineId, updateData, shopId) => {
        try {
            const response = await apiClient.patch(`/machines/${machineId}`, updateData);
            return response.data;
        } catch (error) {
            console.error("Update Machine Config Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    deleteMachine: async (machineId, shopId) => {
        try {
            const response = await apiClient.delete(`/machines/${machineId}`);
            return response.data;
        } catch (error) {
            console.error("Delete Machine Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    getMachineMetrics: async (machineId, shopId) => {
        try {
            const response = await apiClient.get(`/machines/${machineId}/metrics`);
            return response.data;
        } catch (error) {
            console.error("Fetch Machine Metrics Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    toggleMaintenance: async (machineId, shopId) => {
        try {
            const response = await apiClient.patch(`/machines/${machineId}/maintenance`);
            return response.data;
        } catch (error) {
            console.error("Toggle Maintenance Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    initializeDefaultMachines: async (shopId) => {
        try {
            const response = await apiClient.post('/machines/initialize');
            return response.data;
        } catch (error) {
            console.error("Initialization Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

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
    getCustomerSegments,
    getSalesSummary,
    getAllBookings,

    // --- OPTIMIZATION SETTINGS METHODS ---

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
                electricity_rate: settingsData.electricity_rate !== undefined ? parseFloat(settingsData.electricity_rate) : undefined,
                water_rate: settingsData.water_rate !== undefined ? parseFloat(settingsData.water_rate) : undefined,
                supplies_cost_per_load: settingsData.supplies_cost_per_load !== undefined ? parseFloat(settingsData.supplies_cost_per_load) : undefined
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

    getServiceTypes: async (shopId) => {
        try {
            const response = await apiClient.get('/settings/services');
            return response.data;
        } catch (error) {
            console.error("Fetch Service Types Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    addServiceType: async (serviceData, shopId) => {
        try {
            const payload = {
                name: serviceData.name,
                price: parseFloat(serviceData.price),
                is_active: serviceData.is_active !== undefined ? Boolean(serviceData.is_active) : true,
                duration_minutes: serviceData.duration_minutes !== undefined
                    ? parseInt(serviceData.duration_minutes)
                    : 45,
                pricing_unit: serviceData.pricing_unit || 'load',
            };
            const response = await apiClient.post('/settings/services', payload);
            return response.data;
        } catch (error) {
            console.error("Add Service Type Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

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

    deleteServiceType: async (serviceId, shopId) => {
        try {
            const response = await apiClient.delete(`/settings/services/${serviceId}`);
            return response.data;
        } catch (error) {
            console.error("Delete Service Type Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    // --- ADD-ON METHODS ---

    getAddOns,
    addAddOn,
    updateAddOn,
    deleteAddOn,

    // --- PROMO CODE METHODS ---

    getPromoCodes,
    addPromoCode,
    updatePromoCode,
    deletePromoCode,

    // --- PROFILE & PASSWORD METHODS ---

    getShopProfile,
    updateShopProfile,
    updatePassword,

    // --- ACTIVITY LOG METHODS ---

    getActivityLogs,

    // --- NOTIFICATION / AWAITING-APPROVAL METHODS ---

    getAwaitingApprovalBookings,
    acceptBooking,
    declineBooking,

    // --- UTILS ---

    getShopId: () => localStorage.getItem('shop_id'),
    getRole: () => localStorage.getItem('role'),
    getFullName: () => localStorage.getItem('full_name'),
    getAuthHeader: () => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    }
};

export default apiService;