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
import { formatCurrency, formatDateTime } from '../../utils/formatters'

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
        return 'text-primary-600 bg-primary-100 dark:bg-primary-900/20'
      default:
        return 'text-muted bg-base/60/20'
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
            className="relative w-full max-w-2xl bg-card rounded-2xl shadow-2xl overflow-hidden"
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
                <div className="bg-base/60 rounded-xl p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="w-5 h-5 text-muted" />
                    <span className="text-sm font-medium text-muted">
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
                  <div className="bg-base/60 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CreditCard className="w-5 h-5 text-muted" />
                      <span className="text-sm font-medium text-muted">
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
                <h3 className="text-lg font-serif italic text-main">
                  Información de la transacción
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date */}
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-muted mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted">Fecha</p>
                      <p className="text-main">{formatDate(transaction.date)}</p>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="flex items-start space-x-3">
                    <div className="text-lg mt-0.5">{getCategoryIcon(transaction.category)}</div>
                    <div>
                      <p className="text-sm font-medium text-muted">Categoría</p>
                      <p className="text-main capitalize">
                        {transaction.category}
                      </p>
                    </div>
                  </div>

                  {/* Type */}
                  <div className="flex items-start space-x-3">
                    <Tag className="w-5 h-5 text-muted mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted">Tipo</p>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${getTransactionTypeColor(transaction.type)}`}>
                        {transaction.type}
                      </span>
                    </div>
                  </div>

                  {/* Channel */}
                  {transaction.channel && (
                    <div className="flex items-start space-x-3">
                      <Building className="w-5 h-5 text-muted mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted">Canal</p>
                        <p className="text-main capitalize">
                          {transaction.channel}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Transaction ID */}
                  {transaction._id && (
                    <div className="flex items-start space-x-3 md:col-span-2">
                      <Hash className="w-5 h-5 text-muted mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted">ID de Transacción</p>
                        <p className="text-main font-mono text-sm break-all">
                          {transaction._id}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Merchant */}
                  {transaction.merchant && (
                    <div className="flex items-start space-x-3">
                      <Building className="w-5 h-5 text-muted mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted">Comercio</p>
                        <p className="text-main">{transaction.merchant}</p>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {transaction.location && (
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-5 h-5 text-muted mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted">Ubicación</p>
                        <p className="text-main">{transaction.location}</p>
                      </div>
                    </div>
                  )}

                  {/* Reference */}
                  {transaction.reference && (
                    <div className="flex items-start space-x-3 md:col-span-2">
                      <Hash className="w-5 h-5 text-muted mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted">Referencia</p>
                        <p className="text-main">{transaction.reference}</p>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {transaction.notes && (
                    <div className="flex items-start space-x-3 md:col-span-2">
                      <User className="w-5 h-5 text-muted mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted">Notas</p>
                        <p className="text-main">{transaction.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Created/Updated timestamps */}
              {(transaction.createdAt || transaction.updatedAt) && (
                <div className="border-t border-subtle pt-4">
                  <h4 className="text-sm font-medium text-muted mb-3">
                    Información del sistema
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {transaction.createdAt && (
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-muted" />
                        <span className="text-muted">Creado:</span>
                        <span className="text-main">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {transaction.updatedAt && (
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-muted" />
                        <span className="text-muted">Actualizado:</span>
                        <span className="text-main">
                          {new Date(transaction.updatedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-base/60 px-6 py-4 flex justify-end">
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
