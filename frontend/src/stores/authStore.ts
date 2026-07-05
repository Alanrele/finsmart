import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  lastActivity: number | null

  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (userData: Partial<User>) => void
  setLoading: (loading: boolean) => void
  updateLastActivity: () => void
  isSessionValid: () => boolean
  clearExpiredSession: () => boolean
  getAuthHeader: () => Record<string, string>
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      lastActivity: null,

      // Actions
      login: (user, token) => {
        console.log('🔐 AuthStore: Login llamado con:', { user, hasToken: !!token })
        const currentTime = Date.now()
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          lastActivity: currentTime,
        })
        console.log('🔐 AuthStore: Estado después del login:', get())
      },

      logout: () => {
        console.log('🔐 AuthStore: Logout llamado')
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          lastActivity: null,
        })
        // Clear localStorage
        localStorage.removeItem('auth-storage')
        console.log('🔐 AuthStore: Estado después del logout:', get())
      },

      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData } as User,
        }))
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      updateLastActivity: () => {
        set({ lastActivity: Date.now() })
      },

      // Verificar si la sesión ha expirado (30 minutos de inactividad)
      isSessionValid: () => {
        const { lastActivity } = get()
        if (!lastActivity) return false

        const thirtyMinutes = 30 * 60 * 1000
        const now = Date.now()
        return now - lastActivity < thirtyMinutes
      },

      // Limpiar sesión expirada
      clearExpiredSession: () => {
        const { isSessionValid, logout } = get()
        if (!isSessionValid()) {
          console.log('🔐 AuthStore: Sesión expirada, cerrando sesión')
          logout()
          return true
        }
        return false
      },

      // Getters
      getAuthHeader: (): Record<string, string> => {
        const token = get().token
        return token ? { Authorization: `Bearer ${token}` } : {}
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity,
      }) as AuthState,
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('🔐 AuthStore: Estado rehidratado desde localStorage:', state)
          if (state.clearExpiredSession) {
            state.clearExpiredSession()
          }
        }
      },
    }
  )
)

export default useAuthStore
