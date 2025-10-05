import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAppStore = create(
  persist(
    (set, get) => ({
      // Theme
      theme: 'dark',

      // Dashboard data
      dashboardData: null,

      // Transactions
      transactions: [],
      transactionsLoading: false,

      // Microsoft Graph connection
      isGraphConnected: false,
      lastSync: null,

      // AI analysis
      aiAnalysis: null,
      aiLoading: false,

      // Notifications
      notifications: [],

      // Chat messages
      chatMessages: [],

      // Actions
      setTheme: (theme) => {
        set({ theme })
        document.documentElement.setAttribute('data-theme', theme)
        if (theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },

      setDashboardData: (data) => {
        set({ dashboardData: data })
      },

      setTransactions: (transactions) => {
        set({ transactions, transactionsLoading: false })
      },

      addTransaction: (transaction) => {
        set((state) => ({
          transactions: [transaction, ...state.transactions]
        }))
      },

      setTransactionsLoading: (loading) => {
        set({ transactionsLoading: loading })
      },

      setGraphConnection: (connected, lastSync = null) => {
        set({
          isGraphConnected: connected,
          lastSync: lastSync || new Date()
        })
      },

      setAiAnalysis: (analysis) => {
        set({ aiAnalysis, aiLoading: false })
      },

      setAiLoading: (loading) => {
        set({ aiLoading: loading })
      },

      addNotification: (notification) => {
        const newNotification = {
          id: Date.now() + Math.random(),
          timestamp: new Date(),
          ...notification
        }
        set((state) => ({
          notifications: [newNotification, ...state.notifications]
        }))
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }))
      },

      clearNotifications: () => {
        set({ notifications: [] })
      },

      addChatMessage: (message) => {
        const newMessage = {
          id: Date.now() + Math.random(),
          timestamp: new Date(),
          ...message
        }
        set((state) => ({
          chatMessages: [...state.chatMessages, newMessage]
        }))
      },

      clearChat: () => {
        set({ chatMessages: [] })
      },

      // Initialize theme on app start
      initializeTheme: () => {
        const { theme } = get()
        document.documentElement.setAttribute('data-theme', theme)
        if (theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        theme: state.theme,
        isGraphConnected: state.isGraphConnected,
        lastSync: state.lastSync
      })
    }
  )
)

export default useAppStore
