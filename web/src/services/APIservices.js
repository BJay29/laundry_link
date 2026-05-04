import axios from 'axios';

/**
 * Base URL for the FastAPI backend deployed on Render.
 * Verified from your environment setup.
 */
const BASE_URL = 'https://laundrylink-backend-8p1l.onrender.com';

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Interceptor to automatically attach the Bearer token to every request
 * if it exists in localStorage.
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
     * Authenticates administrative users and saves shop-specific session data.
     */
    login: async (email, password) => {
        try {
            const response = await apiClient.post('/auth/login', { email, password });
            const { user, access_token } = response.data;

            // Save critical shop and session data to localStorage.
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
        localStorage.clear();
        window.location.href = '/login';
    },

    // --- DASHBOARD & ANALYTICS METHODS ---
    /**
     * Fetches real-time summary for the Dashboard (Revenue, Utilization, etc.)
     * Uses shop_id from localStorage for targeted data.
     */
    getDashboardStats: async () => {
        try {
            const shopId = localStorage.getItem('shop_id');
            const response = await apiClient.get(`/analytics/dashboard-summary/${shopId}`);
            return response.data;
        } catch (error) {
            console.error("Dashboard Stats Fetch Error:", error);
            throw error;
        }
    },

    /**
     * Fetches forecast data for the Bar/Line charts.
     */
    getForecastData: async () => {
        try {
            const shopId = localStorage.getItem('shop_id');
            const response = await apiClient.get(`/analytics/forecast/${shopId}`);
            return response.data;
        } catch (error) {
            console.error("Forecast Data Fetch Error:", error);
            throw error;
        }
    },

    // --- HELPER METHODS ---
    getShopId: () => localStorage.getItem('shop_id'),
    
    getAuthHeader: () => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    }
};

// Also exporting as default to prevent "import not found" errors
export default apiService;