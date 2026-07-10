/*
  Tipos de dominio compartidos del frontend Kipu.
  Reflejan los contratos de datos que ya usa la app (no cambian el runtime).
*/

export interface User {
  _id?: string
  id?: string
  email?: string
  firstName?: string
  lastName?: string
  isDemo?: boolean
  preferences?: UserPreferences
  [key: string]: unknown
}

export interface UserPreferences {
  theme?: 'light' | 'dark'
  currency?: string
  notifications?: { email?: boolean; push?: boolean }
}

export type TransactionType =
  | 'debit' | 'credit' | 'transfer' | 'payment' | 'withdrawal' | 'deposit'
  | 'income' | 'expense'

export interface Transaction {
  _id?: string
  id?: string
  amount: number
  currency?: string
  type: TransactionType
  category?: string
  subcategory?: string
  merchant?: string
  description?: string
  channel?: string
  date: string | Date
  balance?: number | null
  [key: string]: unknown
}

export interface AppNotification {
  id?: string | number
  type?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message?: string
  priority?: 'low' | 'medium' | 'high'
  timestamp?: string | Date
  date?: string | Date
  autoClose?: boolean
  [key: string]: unknown
}

export interface ChatMessage {
  id?: string | number
  type?: string // 'user' | 'assistant' | 'ai' | 'kipu' según la vista
  sender?: string
  content: string
  timestamp?: string | Date
  isError?: boolean
  [key: string]: unknown
}

export type Theme = 'light' | 'dark'

// ===== Tipos de las respuestas/estados antes marcados como TODO =====

export interface DashboardSummary {
  totalSpending?: number
  totalIncome?: number
  balance?: number
  transactionCount?: number
  spendingChange?: number
  spendingChangePercentage?: number
  previousMonthSpending?: number | null
  unclassifiedCount?: number
}

export interface DashboardData {
  summary?: DashboardSummary
  categorySpending?: Array<{ category: string; amount: number; percentage: number }>
  topCategories?: Array<{ category: string; amount: number; percentage: number }>
  topMerchants?: Array<{ name: string; amount: number }>
  recentTransactions?: Transaction[]
  period?: { month: number; year: number }
  [key: string]: unknown
}

export interface AiAnalysis {
  summary?: string
  score?: number
  warnings?: string[]
  insights?: string[]
  recommendations?: Array<string | { title?: string; description?: string }>
  trends?: any[]
  [key: string]: unknown
}

export interface SyncStatus {
  syncEnabled: boolean
  lastSync: string | Date | null
  hasConnection: boolean
  recentTransactions: number
  isDemo: boolean
  message?: string
  [key: string]: unknown
}

export interface HealthScore {
  total: number
  savingsRate: string
  emergencyMonths: string
  debtRatio: string
  expenseRatio: string
  level: string
}

export interface AssistantMessage {
  type: string
  content?: string
  suggestions?: string[]
  insights?: string[]
  recommendations?: Array<string | { title?: string; description?: string }>
  timestamp?: string | Date
  isError?: boolean
}

export interface ClassificationRule {
  id: string
  category: string
  matchType: string
  pattern: string
  field: string
  priority: number
  enabled: boolean
}

export interface Category {
  key: string
  label: string
  kind?: string
  color?: string
  [key: string]: unknown
}

export interface PdfCredentialInfo {
  id: string
  label: string
  lastUsedAt?: string | null
  createdAt?: string
}
