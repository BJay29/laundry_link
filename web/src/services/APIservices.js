import axios from 'axios';

/**
 * Base URL for the FastAPI backend deployed on Render.
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
 * Automatically attaches the JWT Bearer token to the Authorization header 
 * if a valid token is found in the browser's localStorage.
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
    
    /**
     * Authenticates the user and persists shop-specific metadata.
     * Stores the access token and shop details to maintain session context.
     */
    login: async (email, password) => {
        try {
            const response = await apiClient.post('/auth/login', { email, password });
            const { user, access_token } = response.data;

            // Session Persistence Layer
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

    /**
     * Clears all session data and redirects the user to the login screen.
     */
    logout: () => {
        localStorage.clear();
        window.location.href = '/login';
    },

    // --- BOOKING & TRANSACTION METHODS ---
    
    /**
     * Creates a new laundry transaction.
     * Includes washer_id and dryer_id to trigger real-time 'Busy' status in the Monitoring Grid.
     */
    createBooking: async (bookingData) => {
        try {
            const response = await apiClient.post('/bookings/', bookingData);
            return response.data;
        } catch (error) {
            console.error("Create Booking Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * Fetches active orders (Pending or In Progress).
     * Used to populate the Service Terminal and real-time status trackers.
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
     * Transitions a booking status (e.g., from 'In Progress' to 'Ready').
     * Transitioning to 'Ready' or 'Claimed' automatically sets assigned machines back to 'Available'.
     */
    updateBookingStatus: async (bookingId, newStatus) => {
        try {
            const response = await apiClient.patch(`/bookings/${bookingId}/status`, null, {
                params: { new_status: newStatus }
            });
            return response.data;
        } catch (error) {
            console.error("Update Booking Status Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    // --- MACHINE HUB & MONITORING METHODS ---

    /**
     * Retrieves the hardware status and operational metrics for all units.
     * This is the primary data source for the Machine Hub table and Monitoring Grid.
     */
    getMachines: async () => {
        try {
            const response = await apiClient.get('/machines/');
            return response.data;
        } catch (error) {
            console.error("Fetch Machines Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * Adds a single hardware unit (Washer or Dryer) to the shop.
     * Triggered by the "Add Machine" interface.
     */
    addMachine: async (machineData) => {
        try {
            const response = await apiClient.post('/machines/', machineData);
            return response.data;
        } catch (error) {
            console.error("Add Machine Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * Permanently removes a machine unit from the shop configuration.
     * Deletion is immediate and reflects across all monitoring dashboards.
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

    /**
     * Toggles the maintenance state of a unit.
     * Blocked units cannot be assigned to new customers in the Booking Modal.
     */
    toggleMaintenance: async (machineId) => {
        try {
            const response = await apiClient.patch(`/machines/${machineId}/maintenance`);
            return response.data;
        } catch (error) {
            console.error("Toggle Maintenance Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * Triggers a recalculation of electricity, water, and detergent costs for a unit.
     * Used to refresh the performance metrics in the Machine Hub table.
     */
    getMachineMetrics: async (machineId) => {
        try {
            const response = await apiClient.get(`/machines/${machineId}/metrics`);
            return response.data;
        } catch (error) {
            console.error("Fetch Machine Metrics Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * Seeds the shop with the standard 12-unit configuration (6 Washers, 6 Dryers).
     * Ideal for quick setup of new shop environments.
     */
    initializeMachines: async () => {
        try {
            const response = await apiClient.post('/machines/initialize');
            return response.data;
        } catch (error) {
            console.error("Machine Initialization Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    // --- ANALYTICS & INSIGHTS ---

    /**
     * Retrieves aggregated financial and operational data for the Main Dashboard.
     */
    getDashboardStats: async () => {
        try {
            const shopId = localStorage.getItem('shop_id');
            if (!shopId) throw new Error("Missing shop_id in local storage");
            
            const response = await apiClient.get(`/analytics/dashboard-summary/${shopId}`);
            return response.data;
        } catch (error) {
            console.error("Dashboard Stats Fetch Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    /**
     * Retrieves predictive occupancy and revenue forecasts based on historical data.
     */
    getForecastData: async () => {
        try {
            const shopId = localStorage.getItem('shop_id');
            if (!shopId) throw new Error("Missing shop_id in local storage");

            const response = await apiClient.get(`/analytics/forecast/${shopId}`);
            return response.data;
        } catch (error) {
            console.error("Forecast Data Fetch Error:", error.response?.data?.detail || error.message);
            throw error;
        }
    },

    // --- UTILITY HELPERS ---
    
    getShopId: () => localStorage.getItem('shop_id'),
    
    getAuthHeader: () => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    }
};

export default apiService;