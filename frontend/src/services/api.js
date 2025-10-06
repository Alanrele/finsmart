import axios from 'axios'

// Configurar URL del backend para producción y desarrollo
const getApiBaseUrl = () => {
  // Si estamos en producción (Railway), usar la URL de Railway
  if (import.meta.env.PROD || window.location.hostname !== 'localhost') {
    return 'https://finsmart-production.up.railway.app/api'
  }
  // En desarrollo local
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
}

const API_BASE_URL = getApiBaseUrl()

console.log('🔗 API Base URL:', API_BASE_URL)

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-storage')
    if (token) {
      try {
        const authData = JSON.parse(token)
        if (authData.state?.token) {
          config.headers.Authorization = `Bearer ${authData.state.token}`
        }
      } catch (error) {
        console.error('Error parsing auth token:', error)
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth-storage')
      window.location.href = '/login'
    }
    return Promise.reject(error)
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
  disconnect: () => api.post('/graph/disconnect')
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
