import axios from 'axios';
import supabase from './supabaseclient';

const BASE_URL = 'https://laundrylink-backend-8p1l.onrender.com';

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
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

export const getSalesSummary = async () => {
    try {
        const response = await apiClient.get('/analytics/sales-summary');
        return response.data;
    } catch (error) {
        console.error("Fetch Sales Summary Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

export const getAllBookings = async () => {
    try {
        const response = await apiClient.get('/bookings/all');
        return response.data;
    } catch (error) {
        console.error("Fetch All Bookings Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

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

/**
 * FIXED / NEW — uploads a shop's payment QR code image directly to
 * Supabase Storage (bucket "payment-qr-codes") and returns the public
 * URL, which the caller then saves onto the Shop profile via
 * updateShopProfile().
 *
 * IMPORTANT: pulls the CURRENT Supabase session via
 * supabase.auth.getSession() — the same pattern the apiClient
 * interceptor above uses — instead of reading a raw token from
 * localStorage. Nothing in this file ever writes a plain 'token' key
 * to localStorage (only user_email/shop_id/shop_name/shop_address/
 * role/full_name are cached there — see cacheProfile() below), so any
 * code that tried to read `localStorage.getItem('token')` to
 * authenticate a Storage upload would always get null and silently
 * upload as an unauthenticated request, which the bucket's
 * "authenticated users can INSERT" policy then rejects.
 *
 * methodId is used as part of the storage path so multiple payment
 * methods (gcash, paymaya, or any custom provider id) each get their
 * own file without overwriting one another.
 */
export const uploadPaymentQR = async (file, shopId, methodId) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        throw new Error("You're not logged in. Please refresh the page and log in again.");
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `${shopId}/${methodId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('payment-qr-codes')
        .upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) {
        console.error("Upload Payment QR Error:", uploadError.message);
        throw uploadError;
    }

    const { data } = supabase.storage.from('payment-qr-codes').getPublicUrl(filePath);
    return data.publicUrl;
};

export const updatePassword = async (passwordData) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
            throw new Error('You must be logged in to change your password.');
        }

        const { error: reauthError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: passwordData.old_password,
        });
        if (reauthError) throw reauthError;

        const { error: updateError } = await supabase.auth.updateUser({
            password: passwordData.new_password,
        });
        if (updateError) throw updateError;

        return { message: 'Password updated successfully.' };
    } catch (error) {
        console.error("Update Password Error:", error.message);
        throw error;
    }
};

export const registerStaff = async (staffData) => {
    try {
        const payload = {
            full_name: staffData.full_name,
            email: staffData.email,
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

export const getAwaitingApprovalBookings = async () => {
    try {
        const response = await apiClient.get('/bookings/awaiting-approval');
        return response.data;
    } catch (error) {
        console.error("Fetch Awaiting Approval Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

export const acceptBooking = async (bookingId) => {
    try {
        const response = await apiClient.patch(`/bookings/${bookingId}/accept`);
        return response.data;
    } catch (error) {
        console.error("Accept Booking Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

export const declineBooking = async (bookingId, reason) => {
    try {
        const response = await apiClient.patch(`/bookings/${bookingId}/decline`, { reason });
        return response.data;
    } catch (error) {
        console.error("Decline Booking Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

export const markBookingPaid = async (bookingId, paymentMethod = null) => {
    try {
        const response = await apiClient.patch(`/bookings/${bookingId}/mark-paid`, {
            payment_method: paymentMethod
        });
        return response.data;
    } catch (error) {
        console.error("Mark Booking Paid Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

// --- ONLINE PAYMENT VERIFICATION METHODS (NEW — Online Payment feature) ---

export const getPendingVerificationBookings = async () => {
    try {
        const response = await apiClient.get('/bookings/pending-verification');
        return response.data;
    } catch (error) {
        console.error("Fetch Pending Verification Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

export const rejectPayment = async (bookingId, reason) => {
    try {
        const response = await apiClient.patch(`/bookings/${bookingId}/reject-payment`, { reason });
        return response.data;
    } catch (error) {
        console.error("Reject Payment Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

// --- WEIGHING / FINALIZE PRICING METHODS (NEW — Weighing / Finalize
//     Pricing feature, reconciled mula sa Admin Dashboard spec Module B) ---

export const getAwaitingWeighingBookings = async () => {
    try {
        const response = await apiClient.get('/bookings/awaiting-weighing');
        return response.data;
    } catch (error) {
        console.error("Fetch Awaiting Weighing Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

/**
 * pricingData: { final_weight: number, addon_charges: number }
 * Ang buong computation (final_weight × ServiceType.price + addon_charges)
 * ay ginagawa sa BACKEND (finalize_booking_pricing()) — dito lang
 * ipinapasa ang dalawang raw inputs na kinuha sa WeighingPricingModal.
 */
export const finalizeBookingPricing = async (bookingId, pricingData) => {
    try {
        const payload = {
            final_weight: parseFloat(pricingData.final_weight),
            addon_charges: parseFloat(pricingData.addon_charges || 0),
        };
        const response = await apiClient.patch(`/bookings/${bookingId}/finalize-pricing`, payload);
        return response.data;
    } catch (error) {
        console.error("Finalize Pricing Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

// --- ADD-ON METHODS ---

export const getAddOns = async () => {
    try {
        const response = await apiClient.get('/addons/');
        return response.data;
    } catch (error) {
        console.error("Fetch Add-Ons Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

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

export const getPromoCodes = async () => {
    try {
        const response = await apiClient.get('/promo-codes/');
        return response.data;
    } catch (error) {
        console.error("Fetch Promo Codes Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

export const addPromoCode = async (promoData) => {
    try {
        const payload = {
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

export const deletePromoCode = async (promoId) => {
    try {
        const response = await apiClient.delete(`/promo-codes/${promoId}`);
        return response.data;
    } catch (error) {
        console.error("Delete Promo Code Error:", error.response?.data?.detail || error.message);
        throw error;
    }
};

const cacheProfile = async () => {
    const response = await apiClient.get('/auth/profile');
    const profile = response.data;

    localStorage.setItem('user_email', profile.email || '');
    localStorage.setItem('shop_id', profile.shop_id ?? '');
    localStorage.setItem('shop_name', profile.shop_name || '');
    localStorage.setItem('shop_address', profile.address || '');
    localStorage.setItem('role', profile.role || '');
    localStorage.setItem('full_name', profile.full_name || '');

    return profile;
};

// --- API SERVICE OBJECT ---

export const apiService = {

    login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const profile = await cacheProfile();
        return { session: data.session, profile };
    },

    signUp: async ({ fullName, email, password }) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    role: 'owner',
                    full_name: fullName,
                },
            },
        });
        if (error) throw error;
    },

    verifyOtp: async ({ email, code }) => {
        const { error } = await supabase.auth.verifyOtp({
            email,
            token: code,
            type: 'email',
        });
        if (error) throw error;
    },

    resendOtp: async (email) => {
        const { error } = await supabase.auth.resend({ type: 'signup', email });
        if (error) throw error;
    },

    registerShop: async ({ shopName, address }) => {
        await apiClient.post('/auth/register-shop', {
            shop_name: shopName,
            address,
        });
        return await cacheProfile();
    },

    registerStaff,

    logout: async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        window.location.href = '/login';
    },

    updatePassword,

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

     assignMachinesToBooking: async (bookingId, assignData) => {
        try {
            const response = await apiClient.post(`/bookings/${bookingId}/assign-machines`, assignData);
            return response.data;
        } catch (error) {
            console.error("Assign Machines Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    moveLoadToDryer: async (bookingId, loadNumber, moveData) => {
        try {
            const dryerId = (moveData && typeof moveData === 'object')
                ? moveData.dryer_id
                : moveData;
            const response = await apiClient.patch(
                `/bookings/${bookingId}/loads/${loadNumber}/move-to-dryer`,
                { dryer_id: parseInt(dryerId) }
            );
            return response.data;
        } catch (error) {
            console.error("Move to Dryer Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    markBookingPaid,

    // --- ONLINE PAYMENT VERIFICATION METHODS (NEW) ---
    getPendingVerificationBookings,
    rejectPayment,

    // --- WEIGHING / FINALIZE PRICING METHODS (NEW) ---
    getAwaitingWeighingBookings,
    finalizeBookingPricing,

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

    /**
     * UPDATED (reverted to per-service durations): HINDI NA ito ginagamit
     * para mag-set ng cycle duration — tinanggal na ang dating
     * "Machine Durations" section sa Optimization Settings, at ang
     * duration ay nasa ServiceType na ulit (washer_duration_minutes /
     * dryer_duration_minutes). Nanatili ito bilang generic machine
     * config updater (status, telemetry overrides, atbp.) na ginagamit
     * ng Machine Hub.
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

    /**
     * Ang washer_duration_minutes / dryer_duration_minutes ay per-SERVICE
     * na ngayon (hindi per-machine) — ang required_phases ang nagsasabi
     * kung alin sa dalawa ang aktwal na gagamitin sa isang booking:
     *   - "full_service" → parehong washer at dryer duration
     *   - "wash_only"    → washer_duration_minutes lang
     *   - "dry_only"     → dryer_duration_minutes lang
     * Pinapadala pa rin ang PAREHONG fields kahit isa lang ang
     * applicable — tumutugma ito sa ServiceTypeBase sa backend, kung
     * saan required (may default na 45) ang dalawa; yung hindi
     * applicable ay basta hindi ginagamit sa booking flow.
     */
       addServiceType: async (serviceData, shopId) => {
        try {
            const payload = {
                name: serviceData.name,
                price: parseFloat(serviceData.price),
                is_active: serviceData.is_active !== undefined ? Boolean(serviceData.is_active) : true,
                pricing_unit: serviceData.pricing_unit || 'load',
                required_phases: serviceData.required_phases || 'full_service',
                washer_duration_minutes: serviceData.washer_duration_minutes !== undefined && serviceData.washer_duration_minutes !== ''
                    ? parseInt(serviceData.washer_duration_minutes)
                    : 45,
                dryer_duration_minutes: serviceData.dryer_duration_minutes !== undefined && serviceData.dryer_duration_minutes !== ''
                    ? parseInt(serviceData.dryer_duration_minutes)
                    : 45,
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
            if (payload.washer_duration_minutes !== undefined) payload.washer_duration_minutes = parseInt(payload.washer_duration_minutes);
            if (payload.dryer_duration_minutes !== undefined) payload.dryer_duration_minutes = parseInt(payload.dryer_duration_minutes);
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
    uploadPaymentQR,

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
        return {};
    }
};

export default apiService;