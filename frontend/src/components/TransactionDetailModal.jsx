import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Calendar,
  DollarSign,
  Tag,
  MapPin,
  CreditCard,
  Hash,
  Clock,
  TrendingUp,
  TrendingDown,
  Building,
  User
} from 'lucide-react'
import { formatCurrency, formatDateTime } from '../utils/formatters'

const TransactionDetailModal = ({ transaction, isOpen, onClose }) => {
  if (!transaction) return null

  const formatDate = (date) => {
    return formatDateTime(date)
  }

  const getTransactionTypeColor = (type) => {
    switch (type) {
      case 'credit':
      case 'deposit':
      case 'income':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      case 'debit':
      case 'withdrawal':
      case 'payment':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      case 'transfer':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
      default:
        return 'text-zinc-600 bg-zinc-100 dark:bg-zinc-900/20'
    }
  }

  const getCategoryIcon = (category) => {
    const icons = {
      food: '🍽️',
      transport: '🚗',
      entertainment: '🎬',
      shopping: '🛍️',
      healthcare: '🏥',
      utilities: '⚡',
      education: '📚',
      travel: '✈️',
      investment: '📈',
      income: '💰',
      transfer: '🔄',
      other: '📄'
    }
    return icons[category] || '📄'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-white/20`}>
                    {transaction.type === 'credit' || transaction.type === 'deposit' || transaction.type === 'income' ? (
                      <TrendingUp className="w-6 h-6" />
                    ) : (
                      <TrendingDown className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Detalles de Transacción</h2>
                    <p className="text-white/80">
                      {transaction.description || transaction.merchant || 'Transacción bancaria'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
              {/* Amount and Balance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-xl p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Monto
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${
                    transaction.type === 'credit' || transaction.type === 'deposit' || transaction.type === 'income'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {transaction.type === 'credit' || transaction.type === 'deposit' || transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>

                {transaction.balance && (
                  <div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CreditCard className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                      <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        Saldo después
                      </span>
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-primary dark:text-primary-300">
                      {formatCurrency(transaction.balance)}
                    </p>
                  </div>
                )}
              </div>

              {/* Transaction Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Información de la transacción
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date */}
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-zinc-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Fecha</p>
                      <p className="text-zinc-900 dark:text-white">{formatDate(transaction.date)}</p>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="flex items-start space-x-3">
                    <div className="text-lg mt-0.5">{getCategoryIcon(transaction.category)}</div>
                    <div>
                      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Categoría</p>
                      <p className="text-zinc-900 dark:text-white capitalize">
                        {transaction.category}
                      </p>
                    </div>
                  </div>

                  {/* Type */}
                  <div className="flex items-start space-x-3">
                    <Tag className="w-5 h-5 text-zinc-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Tipo</p>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${getTransactionTypeColor(transaction.type)}`}>
                        {transaction.type}
                      </span>
                    </div>
                  </div>

                  {/* Channel */}
                  {transaction.channel && (
                    <div className="flex items-start space-x-3">
                      <Building className="w-5 h-5 text-zinc-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Canal</p>
                        <p className="text-zinc-900 dark:text-white capitalize">
                          {transaction.channel}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Transaction ID */}
                  {transaction._id && (
                    <div className="flex items-start space-x-3 md:col-span-2">
                      <Hash className="w-5 h-5 text-zinc-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">ID de Transacción</p>
                        <p className="text-zinc-900 dark:text-white font-mono text-sm break-all">
                          {transaction._id}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Merchant */}
                  {transaction.merchant && (
                    <div className="flex items-start space-x-3">
                      <Building className="w-5 h-5 text-zinc-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Comercio</p>
                        <p className="text-zinc-900 dark:text-white">{transaction.merchant}</p>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {transaction.location && (
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-5 h-5 text-zinc-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Ubicación</p>
                        <p className="text-zinc-900 dark:text-white">{transaction.location}</p>
                      </div>
                    </div>
                  )}

                  {/* Reference */}
                  {transaction.reference && (
                    <div className="flex items-start space-x-3 md:col-span-2">
                      <Hash className="w-5 h-5 text-zinc-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Referencia</p>
                        <p className="text-zinc-900 dark:text-white">{transaction.reference}</p>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {transaction.notes && (
                    <div className="flex items-start space-x-3 md:col-span-2">
                      <User className="w-5 h-5 text-zinc-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Notas</p>
                        <p className="text-zinc-900 dark:text-white">{transaction.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Created/Updated timestamps */}
              {(transaction.createdAt || transaction.updatedAt) && (
                <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                  <h4 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-3">
                    Información del sistema
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {transaction.createdAt && (
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-zinc-400" />
                        <span className="text-zinc-600 dark:text-zinc-400">Creado:</span>
                        <span className="text-zinc-900 dark:text-white">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {transaction.updatedAt && (
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-zinc-400" />
                        <span className="text-zinc-600 dark:text-zinc-400">Actualizado:</span>
                        <span className="text-zinc-900 dark:text-white">
                          {new Date(transaction.updatedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-zinc-50 dark:bg-zinc-700/50 px-6 py-4 flex justify-end">
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default TransactionDetailModal
