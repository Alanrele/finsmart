import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppNotification, ChatMessage, Theme, Transaction } from '../types'

interface AppState {
  theme: Theme
  appReady: boolean
  dashboardData: unknown | null
  transactions: Transaction[]
  transactionsLoading: boolean
  isGraphConnected: boolean
  lastSync: string | null
  aiAnalysis: unknown | null
  aiLoading: boolean
  notifications: AppNotification[]
  chatMessages: ChatMessage[]

  setTheme: (theme: Theme) => void
  setDashboardData: (data: unknown) => void
  setAppReady: (ready: boolean) => void
  setTransactions: (transactions: Transaction[]) => void
  addTransaction: (transaction: Transaction) => void
  setTransactionsLoading: (loading: boolean) => void
  setGraphConnection: (connected: boolean, lastSync?: string | Date | null) => void
  setAiAnalysis: (analysis: unknown) => void
  setAiLoading: (loading: boolean) => void
  addNotification: (notification: AppNotification) => void
  removeNotification: (id: string | number) => void
  clearNotifications: () => void
  addChatMessage: (message: ChatMessage) => void
  clearChat: () => void
  initializeTheme: () => void
}

const applyTheme = (theme: Theme) => {
  document.documentElement.setAttribute('data-theme', theme)
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      appReady: false,
      dashboardData: null,
      transactions: [],
      transactionsLoading: false,
      isGraphConnected: false,
      lastSync: null,
      aiAnalysis: null,
      aiLoading: false,
      notifications: [],
      chatMessages: [],

      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },

      setDashboardData: (data) => {
        set({ dashboardData: data })
      },

      setAppReady: (ready) => {
        set({ appReady: !!ready })
      },

      setTransactions: (transactions) => {
        set({ transactions, transactionsLoading: false })
      },

      addTransaction: (transaction) => {
        set((state) => ({
          transactions: [transaction, ...state.transactions],
        }))
      },

      setTransactionsLoading: (loading) => {
        set({ transactionsLoading: loading })
      },

      setGraphConnection: (connected, lastSync = null) => {
        const value = lastSync ? new Date(lastSync) : new Date()
        set({
          isGraphConnected: connected,
          lastSync: value.toISOString(),
        })
      },

      // NOTA: la versión JS previa tenía un typo (`set({ aiAnalysis, ... })`
      // referenciaba una variable inexistente en lugar del parámetro). Se
      // corrige al valor evidentemente pretendido. Ver reporte de migración.
      setAiAnalysis: (analysis) => {
        set({ aiAnalysis: analysis, aiLoading: false })
      },

      setAiLoading: (loading) => {
        set({ aiLoading: loading })
      },

      addNotification: (notification) => {
        const newNotification: AppNotification = {
          id: Date.now() + Math.random(),
          timestamp: new Date(),
          ...notification,
        }
        set((state) => ({
          notifications: [newNotification, ...state.notifications],
        }))
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }))
      },

      clearNotifications: () => {
        set({ notifications: [] })
      },

      addChatMessage: (message) => {
        const newMessage: ChatMessage = {
          id: Date.now() + Math.random(),
          timestamp: new Date(),
          ...message,
        }
        set((state) => ({
          chatMessages: [...state.chatMessages, newMessage],
        }))
      },

      clearChat: () => {
        set({ chatMessages: [] })
      },

      initializeTheme: () => {
        applyTheme(get().theme)
      },
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        theme: state.theme,
        isGraphConnected: state.isGraphConnected,
        lastSync: state.lastSync,
      }) as AppState,
    }
  )
)

export default useAppStore
