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
}

export interface ChatMessage {
  id?: string | number
  type?: 'user' | 'assistant'
  content: string
  timestamp?: string | Date
  isError?: boolean
}

export type Theme = 'light' | 'dark'
