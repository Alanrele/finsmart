import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      lastActivity: null,

      // Actions
      login: (user, token) => {
        console.log('🔐 AuthStore: Login llamado con:', { user, hasToken: !!token });
        const currentTime = Date.now();
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          lastActivity: currentTime
        });
        console.log('🔐 AuthStore: Estado después del login:', get());
      },

      logout: () => {
        console.log('🔐 AuthStore: Logout llamado');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          lastActivity: null
        });
        // Clear localStorage
        localStorage.removeItem('auth-storage');
        console.log('🔐 AuthStore: Estado después del logout:', get());
      },

      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData }
        }))
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      updateLastActivity: () => {
        const currentTime = Date.now();
        set({ lastActivity: currentTime });
      },

      // Verificar si la sesión ha expirado (30 minutos de inactividad)
      isSessionValid: () => {
        const { lastActivity } = get();
        if (!lastActivity) return false;
        
        const thirtyMinutes = 30 * 60 * 1000; // 30 minutos en ms
        const now = Date.now();
        return (now - lastActivity) < thirtyMinutes;
      },

      // Limpiar sesión expirada
      clearExpiredSession: () => {
        const { isSessionValid, logout } = get();
        if (!isSessionValid()) {
          console.log('🔐 AuthStore: Sesión expirada, cerrando sesión');
          logout();
          return true;
        }
        return false;
      },

      // Getters
      getAuthHeader: () => {
        const token = get().token
        return token ? { Authorization: `Bearer ${token}` } : {}
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('🔐 AuthStore: Estado rehidratado desde localStorage:', state);
          // Verificar si la sesión ha expirado al rehidratar
          if (state.clearExpiredSession) {
            state.clearExpiredSession();
          }
        }
      },
    }
  )
)

export default useAuthStore
