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

export const apiService = {
    
    // --- AUTHENTICATION METHODS ---
    
    login: async (email, password) => {
        try {
            const response = await apiClient.post('/auth/login', { email, password });
            const { user, access_token } = response.data;

            // Persist session data in LocalStorage for state management across refreshes
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

    logout: () => {
        // Clear all stored session data and redirect to the login portal
        localStorage.clear();
        window.location.href = '/login';
    },

    // --- BOOKING & TRANSACTION METHODS ---
    
    createBooking: async (bookingData) => {
        try {
            /**
             * Data Sanitization & Schema Alignment:
             * Converts inputs to specific types (Int/Float/Boolean) to match 
             * the strict validation of the FastAPI/SQLAlchemy backend.
             */
            const payload = {
                ...bookingData,
                shop_id: bookingData.shop_id ? parseInt(bookingData.shop_id) : parseInt(localStorage.getItem('shop_id')),
                washer_id: bookingData.washer_id ? parseInt(bookingData.washer_id) : null,
                dryer_id: bookingData.dryer_id ? parseInt(bookingData.dryer_id) : null,
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

    /**
     * Fetches bookings that are 'In Progress' or 'Ready' for the Terminal UI.
     * Supports new database columns to ensure data renders correctly in the table.
     */
    getActiveBookings: async () => {
        try {
            const response = await apiClient.get('/bookings/active');
            return response.data;
        } catch (error) {
            console.error("Fetch Active Bookings Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * Status Lifecycle Update:
     * Triggers machine release and accumulated profit logic in the backend.
     */
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

    // --- MACHINE HUB & TELEMETRY METHODS ---

    getMachines: async () => {
        try {
            const shopId = localStorage.getItem('shop_id');
            const response = await apiClient.get('/machines/', {
                params: shopId ? { shop_id: parseInt(shopId) } : {}
            });
            return response.data;
        } catch (error) {
            console.error("Fetch Machines Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * DECOMMISSION HARDWARE (Delete)
     * Permanently removes a machine unit.
     * Backend supports ON DELETE SET NULL to preserve historical booking data.
     */
    deleteMachine: async (machineId) => {
        try {
            const response = await apiClient.delete(`/machines/${machineId}`);
            return response.data;
        } catch (error) {
            console.error("Delete Machine Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    getMachineMetrics: async (machineId) => {
        try {
            const response = await apiClient.get(`/machines/${machineId}/metrics`);
            return response.data;
        } catch (error) {
            console.error("Fetch Machine Metrics Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    addMachine: async (machineData) => {
        try {
            const shopId = localStorage.getItem('shop_id');
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

    toggleMaintenance: async (machineId) => {
        try {
            const response = await apiClient.patch(`/machines/${machineId}/maintenance`);
            return response.data;
        } catch (error) {
            console.error("Toggle Maintenance Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    initializeDefaultMachines: async () => {
        try {
            const response = await apiClient.post('/machines/initialize');
            return response.data;
        } catch (error) {
            console.error("Initialization Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    // --- ANALYTICS & INSIGHTS ---

    /**
     * Fetches real-time statistics and AI-generated predictions for today.
     * Response includes: today_revenue, full_service, titan_wash, etc.
     */
    getDashboardStats: async () => {
        try {
            const response = await apiClient.get('/analytics/dashboard-summary');
            return response.data;
        } catch (error) {
            console.error("Dashboard Stats Fetch Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * Fetches AI-generated 7-day projections and historical income trends.
     * Used for the Financial Forecast Recharts graph.
     */
    getForecastData: async () => {
        try {
            const response = await apiClient.get('/analytics/forecast-graph');
            return response.data;
        } catch (error) {
            console.error("Forecast Data Fetch Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * Fetches service type popularity distribution.
     */
    getServiceDistribution: async () => {
        try {
            const response = await apiClient.get('/analytics/service-distribution');
            return response.data;
        } catch (error) {
            console.error("Service Distribution Fetch Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * Fetches real-time operational insights (DSS).
     * Analyzes machine health and financial impact for the Dashboard Insight Card.
     */
    getOperationalInsights: async () => {
        try {
            const response = await apiClient.get('/analytics/operational-insights');
            return response.data;
        } catch (error) {
            console.error("Operational Insights Fetch Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    // --- OPTIMIZATION SETTINGS METHODS ---

    /**
     * Fetches current shop configuration including pricing and utility rates.
     */
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

    /**
     * Updates shop settings to adjust service pricing and operational costs.
     */
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

    /**
     * Fetches hardcoded factory default pricing for UI preview.
     */
    getSystemDefaults: async () => {
        try {
            const response = await apiClient.get('/settings/defaults');
            return response.data;
        } catch (error) {
            console.error("Fetch System Defaults Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * Reverts the shop's database entry back to original factory settings.
     */
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

    /**
     * Fetches pricing logic specifically for the Booking Modal.
     */
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

    // --- UTILS ---
    getShopId: () => localStorage.getItem('shop_id'),
    getAuthHeader: () => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    }
};

export default apiService;