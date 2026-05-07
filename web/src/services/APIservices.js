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
             * Data Sanitization:
             * Ensures machine IDs and numeric values are correctly typed as Int/Float.
             * This prevents validation errors in the FastAPI backend.
             */
            const payload = {
                ...bookingData,
                shop_id: bookingData.shop_id ? parseInt(bookingData.shop_id) : parseInt(localStorage.getItem('shop_id')),
                washer_id: bookingData.washer_id ? parseInt(bookingData.washer_id) : null,
                dryer_id: bookingData.dryer_id ? parseInt(bookingData.dryer_id) : null,
                weight: parseFloat(bookingData.weight),
                loads: parseInt(bookingData.loads),
                total_price: parseFloat(bookingData.total_price)
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
            // Fetches bookings that are 'In Progress' or 'Ready' for the Dashboard monitoring grid
            const response = await apiClient.get('/bookings/active');
            return response.data;
        } catch (error) {
            console.error("Fetch Active Bookings Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * UPDATED: Status Lifecycle Update
     * Now sends a JSON body to match the BookingStatusUpdate Pydantic schema.
     * This triggers machine release and profit accumulation logic in the backend.
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
            /**
             * Returns all machines with real-time performance metrics.
             * Data includes the new profitability_rate and remaining_time fields.
             */
            const response = await apiClient.get('/machines/', {
                params: shopId ? { shop_id: parseInt(shopId) } : {}
            });
            return response.data;
        } catch (error) {
            console.error("Fetch Machines Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    getMachineMetrics: async (machineId) => {
        try {
            // Fetches unique predictive metrics (Electricity/Water/Detergent) for a unit
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

    deleteMachine: async (machineId) => {
        try {
            const response = await apiClient.delete(`/machines/${machineId}`);
            return response.data;
        } catch (error) {
            console.error("Delete Machine Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    toggleMaintenance: async (machineId) => {
        try {
            // Switches machine to 'Maintenance' status to prevent new bookings
            const response = await apiClient.patch(`/machines/${machineId}/maintenance`);
            return response.data;
        } catch (error) {
            console.error("Toggle Maintenance Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    initializeDefaultMachines: async () => {
        try {
            // Deploys the standard configuration (6 Washers, 6 Dryers) for a new shop
            const response = await apiClient.post('/machines/initialize');
            return response.data;
        } catch (error) {
            console.error("Initialization Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    // --- ANALYTICS & INSIGHTS ---

    /**
     * Fetches consolidated data for the Dashboard overview.
     * Includes revenue, utilization, and the AI optimization tips.
     */
    getDashboardStats: async () => {
        try {
            const shopId = localStorage.getItem('shop_id');
            if (!shopId) throw new Error("Missing shop_id in session storage");
            const response = await apiClient.get(`/analytics/dashboard-summary/${shopId}`);
            return response.data;
        } catch (error) {
            console.error("Dashboard Stats Fetch Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    getForecastData: async () => {
        try {
            const shopId = localStorage.getItem('shop_id');
            if (!shopId) throw new Error("Missing shop_id in session storage");
            const response = await apiClient.get(`/analytics/forecast/${shopId}`);
            return response.data;
        } catch (error) {
            console.error("Forecast Data Fetch Error:", error.response?.data?.detail || error.message);
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