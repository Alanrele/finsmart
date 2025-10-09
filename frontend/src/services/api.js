import axios from 'axios';
import { getRailwayConfig } from '../config/railway';
import toast from 'react-hot-toast';
import useAuthStore from '../stores/authStore';

// Configurar URL del backend para producción y desarrollo
const getApiBaseUrl = () => {
  const railwayConfig = getRailwayConfig();
  // Agregar /api al final para el backend
  return `${railwayConfig.apiUrl}/api`;
};

const API_BASE_URL = getApiBaseUrl();

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    try {
      const { token, isAuthenticated } = useAuthStore.getState();

      if (token && isAuthenticated) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('❌ Error reading auth state from Zustand:', error);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    // If the response is successful (2xx), just return it.
    if (response.status >= 200 && response.status < 300) {
      return response;
    }

    // For other statuses (like 4xx), which we allow via validateStatus,
    // we can handle them here or let the calling code handle it.
    // For simplicity, we'll let the caller handle non-401 errors.
    if (response.status !== 401) {
        // Log the error for debugging but pass the response through
        console.warn(`⚠️ API Warning: Received status ${response.status}`, response.data);
    }

    return response;
  },
  async (error) => {
    const { response } = error;

    // Handle 401 Unauthorized errors globally
    if (response?.status === 401) {
      console.error('🚨 401 Unauthorized Error Detected. Logging out.');

      const { logout } = useAuthStore.getState();

      // Prevent multiple toasts or logouts if they happen close together
      if (useAuthStore.getState().isAuthenticated) {
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        logout();

        // Redirect to login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    // For all other errors, just reject the promise
    return Promise.reject(error);
  }
);

export default api;

// Example of specific API functions (can be in separate files)

export const getDashboardData = async (filters) => {
    try {
        const response = await api.get('/finance/dashboard', { params: filters });
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to fetch dashboard data');
        return response.data;
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        throw error;
    }
};

export const getTransactions = async (filters) => {
    try {
        const response = await api.get('/finance/transactions', { params: filters });
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to fetch transactions');
        return response.data;
    } catch (error) {
        console.error('Error fetching transactions:', error);
        throw error;
    }
};

export const addTransaction = async (transactionData) => {
    try {
        const response = await api.post('/finance/transactions', transactionData);
        if (response.status !== 201) throw new Error(response.data.error || 'Failed to add transaction');
        return response.data;
    } catch (error) {
        console.error('Error adding transaction:', error);
        throw error;
    }
};

export const updateTransaction = async (id, transactionData) => {
    try {
        const response = await api.put(`/finance/transactions/${id}`, transactionData);
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to update transaction');
        return response.data;
    } catch (error) {
        console.error('Error updating transaction:', error);
        throw error;
    }
};

export const deleteTransaction = async (id) => {
    try {
        const response = await api.delete(`/finance/transactions/${id}`);
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to delete transaction');
        return response.data;
    } catch (error) {
        console.error('Error deleting transaction:', error);
        throw error;
    }
};

export const getCategories = async () => {
    try {
        const response = await api.get('/finance/categories');
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to fetch categories');
        return response.data;
    } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
    }
};

export const getSummary = async () => {
    try {
        const response = await api.get('/finance/summary');
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to fetch summary');
        return response.data;
    } catch (error) {
        console.error('Error fetching summary:', error);
        throw error;
    }
};

export const getForecast = async () => {
    try {
        const response = await api.get('/finance/forecast');
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to fetch forecast');
        return response.data;
    } catch (error) {
        console.error('Error fetching forecast:', error);
        throw error;
    }
};

export const getBudgets = async () => {
    try {
        const response = await api.get('/finance/budgets');
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to fetch budgets');
        return response.data;
    } catch (error) {
        console.error('Error fetching budgets:', error);
        throw error;
    }
};

export const saveBudget = async (budgetData) => {
    try {
        const response = await api.post('/finance/budgets', budgetData);
        if (response.status !== 200 && response.status !== 201) throw new Error(response.data.error || 'Failed to save budget');
        return response.data;
    } catch (error) {
        console.error('Error saving budget:', error);
        throw error;
    }
};

export const loginUser = async (credentials) => {
    try {
        const response = await api.post('/auth/login', credentials);
        if (response.status !== 200) throw new Error(response.data.message || 'Login failed');
        return response.data;
    } catch (error) {
        console.error('Error during login:', error);
        throw error;
    }
};

export const registerUser = async (userData) => {
    try {
        const response = await api.post('/auth/register', userData);
        if (response.status !== 201) throw new Error(response.data.message || 'Registration failed');
        return response.data;
    } catch (error) {
        console.error('Error during registration:', error);
        throw error;
    }
};

// Microsoft Graph related API calls
export const connectGraph = async (tokenData) => {
    try {
        const response = await api.post('/graph/connect', tokenData);
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to connect to Microsoft Graph');
        return response.data;
    } catch (error) {
        console.error('Error connecting to Microsoft Graph:', error);
        throw error;
    }
};

export const verifyGraphToken = async () => {
    try {
        const response = await api.get('/graph/verify-token');
        return response.data; // Let the component interpret the status
    } catch (error) {
        console.error('Error verifying Microsoft Graph token:', error);
        throw error;
    }
};

export const getSyncStatus = async () => {
    try {
        const response = await api.get('/graph/sync-status');
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to get sync status');
        return response.data;
    } catch (error) {
        console.error('Error getting sync status:', error);
        throw error;
    }
};

export const toggleSync = async (enabled) => {
    try {
        const response = await api.post('/graph/sync-toggle', { enabled });
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to toggle sync');
        return response.data;
    } catch (error) {
        console.error('Error toggling sync:', error);
        throw error;
    }
};

export const syncEmails = async () => {
    try {
        const response = await api.post('/graph/sync-emails');
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to sync emails');
        return response.data;
    } catch (error) {
        console.error('Error syncing emails:', error);
        throw error;
    }
};

export const getGraphStatus = async () => {
    try {
        const response = await api.get('/graph/status');
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to get Graph status');
        return response.data;
    } catch (error) {
        console.error('Error getting Graph status:', error);
        throw error;
    }
};

export const disconnectGraph = async () => {
    try {
        const response = await api.post('/graph/disconnect');
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to disconnect Graph');
        return response.data;
    } catch (error) {
        console.error('Error disconnecting Graph:', error);
        throw error;
    }
};

export const reprocessEmails = async () => {
    try {
        const response = await api.post('/graph/reprocess-emails');
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to reprocess emails');
        return response.data;
    } catch (error) {
        console.error('Error reprocessing emails:', error);
        throw error;
    }
};

export const testEmailParser = async (emailContent) => {
    try {
        const response = await api.post('/graph/test-email-parser', { emailContent });
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to test email parser');
        return response.data;
    } catch (error) {
        console.error('Error testing email parser:', error);
        throw error;
    }
};

export const updatePreferences = async (preferences) => {
    try {
        const response = await api.patch('/finance/preferences', preferences);
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to update preferences');
        return response.data;
    } catch (error) {
        console.error('Error updating preferences:', error);
        throw error;
    }
};

export const demoLogin = async () => {
    try {
        const response = await api.post('/auth/demo-login');
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to login demo');
        return response.data;
    } catch (error) {
        console.error('Error during demo login:', error);
        throw error;
    }
};
