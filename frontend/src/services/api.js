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

export const getSpendingByCategory = async () => {
    try {
        const response = await api.get('/finance/spending-by-category');
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to fetch spending data');
        return response.data;
    } catch (error) {
        console.error('Error fetching spending data:', error);
        throw error;
    }
};

export const getIncomeVsExpense = async () => {
    try {
        const response = await api.get('/finance/income-vs-expense');
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to fetch income vs expense data');
        return response.data;
    } catch (error) {
        console.error('Error fetching income vs expense data:', error);
        throw error;
    }
};

export const getFinancialHealth = async () => {
    try {
        const response = await api.get('/finance/financial-health');
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to fetch financial health');
        return response.data;
    } catch (error) {
        console.error('Error fetching financial health:', error);
        throw error;
    }
};

// Auth related API calls
export const loginUser = async (credentials) => {
    try {
        const response = await api.post('/auth/login', credentials);
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to login');
        return response.data;
    } catch (error) {
        console.error('Error logging in:', error);
        throw error;
    }
};

export const registerUser = async (userData) => {
    try {
        const response = await api.post('/auth/register', userData);
        if (response.status !== 201) throw new Error(response.data.error || 'Failed to register');
        return response.data;
    } catch (error) {
        console.error('Error registering user:', error);
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

export const processReceipt = async (file) => {
    const formData = new FormData();
    formData.append('receipt', file);
    try {
        const response = await api.post('/graph/process-receipt', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (response.status !== 200) throw new Error(response.data.error || 'Failed to process receipt');
        return response.data;
    } catch (error) {
        console.error('Error processing receipt:', error);
        throw error;
    }
};
