import axios from 'axios'
import { getRailwayConfig } from '../config/railway'

// Configurar URL del backend para producción y desarrollo
const getApiBaseUrl = () => {
  const railwayConfig = getRailwayConfig();

  console.log('🌐 API Config - Railway Environment:', {
    isDevelopment: railwayConfig.isDevelopment,
    isProduction: railwayConfig.isProduction,
    hostname: railwayConfig.hostname,
    apiUrl: railwayConfig.apiUrl
  });

  // Agregar /api al final para el backend
  return `${railwayConfig.apiUrl}/api`;
}

const API_BASE_URL = getApiBaseUrl()

console.log('🔗 API Base URL:', API_BASE_URL)
console.log('🌐 Current hostname:', window.location.hostname)

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  },
  // Configuración para manejar problemas de SSL en desarrollo
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Resolver para códigos 2xx y 4xx
  },
})

// Función para verificar si el backend está disponible
const checkBackendHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, {
      method: 'GET',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    console.warn('🏥 Backend health check failed:', error.message);
    return false;
  }
};

// Verificar salud del backend al inicializar
checkBackendHealth().then(isHealthy => {
  console.log('🏥 Backend health status:', isHealthy ? '✅ Healthy' : '❌ Unhealthy');
  if (!isHealthy) {
    console.warn('⚠️ Backend no está disponible. Las funcionalidades pueden estar limitadas.');
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    console.log('🔐 API Request interceptor - checking for token...');

    // Intentar obtener el token del localStorage
    const authStorage = localStorage.getItem('auth-storage');

    if (authStorage) {
      try {
        const authData = JSON.parse(authStorage);
        console.log('🔍 Auth data found:', {
          hasState: !!authData.state,
          hasToken: !!authData.state?.token,
          isAuthenticated: authData.state?.isAuthenticated
        });

        if (authData.state?.token && authData.state?.isAuthenticated) {
          config.headers.Authorization = `Bearer ${authData.state.token}`;
          console.log('✅ Authorization header added');
        } else {
          console.warn('⚠️ No valid token found in auth storage');
        }
      } catch (error) {
        console.error('❌ Error parsing auth token:', error);
      }
    } else {
      console.warn('⚠️ No auth storage found');
    }

    console.log('📤 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      hasAuth: !!config.headers.Authorization,
      headers: config.headers
    });

    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      url: response.config.url,
      method: response.config.method?.toUpperCase()
    });
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      data: error.response?.data
    });

    if (error.response?.status === 401) {
      console.warn('🔐 Unauthorized request detected - clearing auth and redirecting');

      // Limpiar el almacenamiento de autenticación
      localStorage.removeItem('auth-storage');

      // Importar y usar el store para hacer logout limpio
      import('../stores/authStore').then(({ default: useAuthStore }) => {
        useAuthStore.getState().logout();
      });

      // Mostrar notificación al usuario
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      });

      // Redirigir al login después de un breve delay
      setTimeout(() => {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }, 1000);
    }

    return Promise.reject(error);
  }
)

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  verify: () => api.get('/auth/verify'),
  microsoftCallback: (data) => api.post('/auth/microsoft/callback', data),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken })
}

// Graph API
export const graphAPI = {
  connect: (tokens) => api.post('/graph/connect', tokens),
  syncEmails: () => api.post('/graph/sync-emails'),
  getStatus: () => api.get('/graph/status'),
  getFolders: () => api.get('/graph/folders'),
  disconnect: () => api.post('/graph/disconnect'),
  testEmailParser: (emailContent) => api.post('/graph/test-email-parser', { emailContent })
}

// Finance API
export const financeAPI = {
  getDashboard: () => api.get('/finance/dashboard'),
  getTransactions: (params) => api.get('/finance/transactions', { params }),
  getSpendingByCategories: (params) => api.get('/finance/spending/categories', { params }),
  getTrends: (params) => api.get('/finance/trends', { params }),
  getSummary: (params) => api.get('/finance/summary', { params }),
  updatePreferences: (preferences) => api.patch('/finance/preferences', preferences)
}

// AI API
export const aiAPI = {
  analyze: (data) => api.post('/ai/analyze', data),
  chat: (message) => api.post('/ai/chat', { message }),
  getInsights: (params) => api.get('/ai/insights', { params }),
  getRecommendations: () => api.get('/ai/recommendations'),
  predict: () => api.get('/ai/predict'),
  categorize: () => api.post('/ai/categorize')
}

// Utility functions
export const handleApiError = (error) => {
  console.error('API Error:', error)

  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.error || error.response.data?.message || 'Error del servidor'
    return {
      message,
      status: error.response.status,
      details: error.response.data?.details
    }
  } else if (error.request) {
    // Network error
    return {
      message: 'Error de conexión. Verifica tu conexión a internet.',
      status: 0
    }
  } else {
    // Other error
    return {
      message: error.message || 'Error inesperado',
      status: 0
    }
  }
}

export default api
