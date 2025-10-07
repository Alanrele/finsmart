import axios from 'axios'
import { getRailwayConfig } from '../config/railway'

// Configurar URL del backend para producción y desarrollo
const getApiBaseUrl = () => {
  const railwayConfig = getRailwayConfig();
  // Agregar /api al final para el backend
  return `${railwayConfig.apiUrl}/api`;
}

const API_BASE_URL = getApiBaseUrl()

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
  if (!isHealthy) {
    console.warn('⚠️ Backend no está disponible. Las funcionalidades pueden estar limitadas.');
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Intentar obtener el token del localStorage (Zustand structure)
    const authStorage = localStorage.getItem('auth-storage');

    if (authStorage) {
      try {
        const authData = JSON.parse(authStorage);

        // Try Zustand structure first (state.token)
        let token = null;
        let isAuthenticated = false;

        if (authData.state?.token && authData.state?.isAuthenticated) {
          token = authData.state.token;
          isAuthenticated = authData.state.isAuthenticated;
        }
        // Fallback to direct structure
        else if (authData.token && authData.isAuthenticated) {
          token = authData.token;
          isAuthenticated = authData.isAuthenticated;
        }

        if (token && isAuthenticated) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('❌ Error parsing auth token:', error);
      }
    }

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
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Check for specific JWT malformed errors
      const errorData = error.response?.data;
      const isJWTMalformed =
        errorData?.code === 'JWT_MALFORMED' ||
        errorData?.code === 'JWT_MALFORMED_BY_MICROSOFT' ||
        errorData?.code === 'INVALID_AUTH_TOKEN_BY_MICROSOFT' ||
        errorData?.message?.includes('JWT is not well formed');

      if (isJWTMalformed) {
        console.error('🔑 JWT malformed error detected - cleaning up corrupted token');

        // Get the corrupted token for cleanup
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          try {
            const authData = JSON.parse(authStorage);
            const corruptedToken = authData.state?.token || authData.token;

            if (corruptedToken) {
              // Call backend to clean up the corrupted token using full API URL
              fetch(`${API_BASE_URL}/auth/cleanup-corrupted-token`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: corruptedToken })
              }).catch(cleanupError => {
                console.error('❌ Token cleanup failed:', cleanupError);
              });
            }
          } catch (parseError) {
            console.error('❌ Error parsing auth data for cleanup:', parseError);
          }
        }

        // Show specific error message for JWT issues
        import('react-hot-toast').then(({ default: toast }) => {
          toast.error('Token de autenticación corrupto. Limpiando automáticamente...');
        });
      } else {
        // Show general session expired message
        import('react-hot-toast').then(({ default: toast }) => {
          toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        });
      }

      // Limpiar el almacenamiento de autenticación
      localStorage.removeItem('auth-storage');

      // Importar y usar el store para hacer logout limpio
      import('../stores/authStore').then(({ default: useAuthStore }) => {
        useAuthStore.getState().logout();
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
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  demoLogin: () => api.post('/auth/demo-login'),
  cleanupCorruptedToken: (token) => api.post('/auth/cleanup-corrupted-token', { token })
}

// Graph API
export const graphAPI = {
  connect: (tokens) => api.post('/graph/connect', tokens),
  syncEmails: () => api.post('/graph/sync-emails'),
  getStatus: () => api.get('/graph/status'),
  getFolders: () => api.get('/graph/folders'),
  disconnect: () => api.post('/graph/disconnect'),
  testEmailParser: (emailContent) => api.post('/graph/test-email-parser', { emailContent }),
  getSyncStatus: () => api.get('/graph/sync-status'),
  toggleSync: (enabled) => api.post('/graph/sync-toggle', { enabled })
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
