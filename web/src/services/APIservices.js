import axios from 'axios';
import supabase from './supabaseclient';

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
 * UPDATED (Supabase Auth migration) — dating kinukuha ang token mula
 * sa localStorage (sariling FastAPI-issued JWT). Ngayon, kinukuha na
 * ito LIVE mula sa kasalukuyang Supabase session — awtomatiko nang
 * pinapanatili at ni-refresh ni Supabase ang session na 'to, kaya
 * laging up-to-date ang access token na ipinapadala natin.
 *
 * Async na ngayon ang interceptor function (dating sync lang) dahil
 * async ang supabase.auth.getSession().
 */
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
 * UPDATED (Supabase Auth migration) — dating tumatawag ito sa
 * PUT /settings/password (na tinanggal na natin sa backend, kasabay
 * ng buong PasswordUpdate schema — see setting_routes.py). Ngayon,
 * direktang Supabase Auth SDK na ang bahala: muna nating "re-verify"
 * ang current password via signInWithPassword() (kailangan ang email
 * ng currently logged-in user), tapos saka lang tatawagin ang
 * updateUser() para itakda ang bago.
 *
 * Signature: tinanggal ang 'userId' param (hindi na kailangan —
 * kinukuha na natin ang naka-login na user mula sa Supabase session
 * mismo). Tinawag pa rin ito nang 'updatePassword' para hindi na
 * kailangang hanapin/palitan ang lahat ng calling sites — pero i-check
 * mo ang securitysettings.jsx mo kung ano ang eksaktong hugis ng
 * 'passwordData' na ipinapasa (in-assume kong { old_password,
 * new_password } ang mga keys, tugma sa dating backend contract).
 */
export const updatePassword = async (passwordData) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
            throw new Error('You must be logged in to change your password.');
        }

        // Re-verify current password bago mag-update.
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

/**
 * NEW — kinukuha ang session profile (email, full_name, role, shop_id,
 * shop_name, address) mula sa GET /auth/profile, tapos kino-cache sa
 * localStorage para magamit ng mga convenience getters sa ibaba
 * (getShopId, getRole, atbp.) nang hindi na kailangang mag-fetch ulit.
 * Tinatawag ito pagkatapos ng login() AT pagkatapos ng registerShop()
 * (dahil doon lang lalabas ang shop_id/shop_name sa unang pagkakataon).
 */
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

    // --- AUTHENTICATION METHODS ---
    // UPDATED (Supabase Auth migration): password storage/verification
    // at OTP email ay Supabase Auth SDK na ang bahala — hindi na ito
    // FastAPI backend na direktang tinatawag para dito.

    login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Kunin at i-cache ang session profile (role, shop_id, atbp.)
        // mula sa sariling backend — dito naka-store ang data na wala
        // sa Supabase Auth mismo.
        const profile = await cacheProfile();
        return { session: data.session, profile };
    },

    /**
     * NEW — Nag-sign up sa Supabase Auth. Ipinapasa ang role/full_name
     * bilang metadata (data:) — babasahin ito ng FastAPI webhook para
     * malaman kung saang table (users vs customers) dapat i-sync ang
     * bagong account. Awtomatikong magpapadala si Supabase ng OTP
     * papunta sa email — susunod na hakbang ay ang VerifyOtpModal.
     */
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

    /**
     * NEW — Kino-confirm ang OTP code. Pagka-successful, may session na
     * agad sa Supabase side.
     */
    verifyOtp: async ({ email, code }) => {
        const { error } = await supabase.auth.verifyOtp({
            email,
            token: code,
            type: 'email',
        });
        if (error) throw error;
    },

    /** NEW — muling magpapadala ng bagong OTP code sa parehong email. */
    resendOtp: async (email) => {
        const { error } = await supabase.auth.resend({ type: 'signup', email });
        if (error) throw error;
    },

    /**
     * NEW — tinatawag PAGKATAPOS ng successful OTP verify (may session
     * na sa Supabase side). Gumagawa ng Shop entity at ni-links ito sa
     * currently-logged-in User (via POST /auth/register-shop, backend
     * endpoint na protected — kinukuha ang current_user mula sa
     * Supabase JWT). Pagkatapos, kino-cache ulit ang profile (ngayon
     * may shop_id/shop_name na).
     */
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
        // NOTE: hindi na ito magagamit nang tama para sa Authorization
        // header (async na kailangan mag-fetch ng session mula
        // Supabase, hindi na simpleng localStorage.getItem() lang).
        // Iniwan lang ito para hindi masira agad ang mga existing
        // caller — sabihin mo kung saan ito ginagamit para maayos
        // natin nang tama.
        return {};
    }
};

export default apiService;