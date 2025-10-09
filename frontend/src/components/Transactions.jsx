import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, Calendar, Download, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { getTransactions } from '../services/api' // Importar directamente la función
import toast from 'react-hot-toast'
import LoadingCard from './LoadingCard'
import TransactionDetailModal from './TransactionDetailModal'
import { formatCurrency, formatCurrencyAuto } from '../utils/formatters'

const Transactions = () => {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false
  })
  const [extensionWarningShown, setExtensionWarningShown] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    type: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20
  })

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true)
      // Usar la función importada directamente
      const data = await getTransactions(filters)
      setTransactions(data.transactions || [])
      setPagination(data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        hasNext: false,
        hasPrev: false
      })
    } catch (error) {
      // El interceptor de API ya maneja los errores 401.
      // Aquí manejamos otros errores específicos de esta llamada.
      toast.error(error.message || 'Error al cargar las transacciones.')
      console.error('❌ Error loading transactions:', error)
      setTransactions([]) // Limpiar en caso de error
    } finally {
      setLoading(false)
    }
  }, [filters]) // filters es la única dependencia necesaria

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions]) // El efecto se ejecuta cuando la función `loadTransactions` cambia (es decir, cuando cambian los filtros)

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedTransaction(null)
  }

  const categories = [
    { value: 'food', label: 'Comida' },
    { value: 'transport', label: 'Transporte' },
    { value: 'entertainment', label: 'Entretenimiento' },
    { value: 'shopping', label: 'Compras' },
    { value: 'healthcare', label: 'Salud' },
    { value: 'utilities', label: 'Servicios' },
    { value: 'education', label: 'Educación' },
    { value: 'travel', label: 'Viajes' },
    { value: 'investment', label: 'Inversiones' },
    { value: 'income', label: 'Ingresos' },
    { value: 'transfer', label: 'Transferencias' },
    { value: 'other', label: 'Otros' }
  ]

  const types = [
    // El backend espera 'income' o 'expense' y mapea internamente a tipos específicos
    { value: 'income', label: 'Ingresos' },
    { value: 'expense', label: 'Gastos' }
  ]

  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction)
    setIsModalOpen(true)
  }

  // Category translation function
  const translateCategory = (category) => {
    const translations = {
      'food': 'Comida',
      'transport': 'Transporte',
      'entertainment': 'Entretenimiento',
      'shopping': 'Compras',
      'healthcare': 'Salud',
      'utilities': 'Servicios',
      'education': 'Educación',
      'travel': 'Viajes',
      'investment': 'Inversiones',
      'income': 'Ingresos',
      'transfer': 'Transferencias',
      'other': 'Otros',
      'salary': 'Salario',
      'savings': 'Ahorros',
      'freelance': 'Freelance'
    }
    return translations[category?.toLowerCase()] || category || 'Otros'
  }

  const handlePageChange = (newPage) => {
    setFilters({...filters, page: newPage})
  }

  const handlePrevPage = () => {
    if (pagination.hasPrev) {
      handlePageChange(pagination.currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (pagination.hasNext) {
      handlePageChange(pagination.currentPage + 1)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingCard />
        {[...Array(5)].map((_, i) => (
          <LoadingCard key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          Transacciones
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Historial completo de tus movimientos financieros
        </p>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value, page: 1})}
                className="input-field pl-10"
                placeholder="Descripción, comercio..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Categoría
            </label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value, page: 1})}
              className="input-field"
            >
              <option value="">Todas las categorías</option>
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value, page: 1})}
              className="input-field"
            >
              <option value="">Todos los tipos</option>
              {types.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fecha inicio
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value, page: 1})}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fecha fin
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value, page: 1})}
              className="input-field"
            />
          </div>
        </div>
      </motion.div>

      {/* Transactions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="space-y-3">
          {!transactions || transactions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No se encontraron transacciones con los filtros aplicados
              </p>
            </div>
          ) : (
            transactions.map((transaction, index) => (
              <motion.div
                key={transaction._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleTransactionClick(transaction)}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className={`p-2 rounded-lg ${
                    transaction.type === 'credit' || transaction.type === 'deposit'
                      ? 'bg-green-100 dark:bg-green-900/20'
                      : 'bg-red-100 dark:bg-red-900/20'
                  }`}>
                    {transaction.type === 'credit' || transaction.type === 'deposit' ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {transaction.description || transaction.merchant || 'Transacción'}
                    </p>
                    <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
                      <span>{new Date(transaction.date).toLocaleDateString()}</span>
                      <span className="capitalize">{translateCategory(transaction.category)}</span>
                      <span className="capitalize">{transaction.channel}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-lg font-semibold ${
                    transaction.type === 'credit' || transaction.type === 'deposit'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {transaction.type === 'credit' || transaction.type === 'deposit' ? '+' : '-'}
                    {formatCurrencyAuto(transaction.amount)}
                  </p>
                  {transaction.balance && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Saldo: {formatCurrencyAuto(transaction.balance)}
                    </p>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between"
        >
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando {transactions.length} de {pagination.totalCount} transacciones
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevPage}
              disabled={!pagination.hasPrev}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>

            <div className="flex items-center space-x-1">
              {/* First page */}
              {pagination.currentPage > 3 && (
                <>
                  <button
                    onClick={() => handlePageChange(1)}
                    className="px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    1
                  </button>
                  {pagination.currentPage > 4 && <span className="px-2">...</span>}
                </>
              )}

              {/* Pages around current page (no duplicates) */}
              {(() => {
                const maxButtons = 5
                const half = Math.floor(maxButtons / 2)
                const total = pagination.totalPages
                const current = pagination.currentPage
                // Compute start and end ensuring a continuous range without clamping duplicates
                let startPage = Math.max(1, current - half)
                let endPage = Math.min(total, startPage + maxButtons - 1)
                // If we don't have enough pages at the end, shift the window left
                startPage = Math.max(1, Math.min(startPage, endPage - maxButtons + 1))

                const buttons = []
                for (let p = startPage; p <= endPage; p++) {
                  buttons.push(
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`px-3 py-2 text-sm rounded-lg ${
                        p === current ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {p}
                    </button>
                  )
                }
                return buttons
              })()}

              {/* Last page */}
              {pagination.currentPage < pagination.totalPages - 2 && (
                <>
                  {pagination.currentPage < pagination.totalPages - 3 && <span className="px-2">...</span>}
                  <button
                    onClick={() => handlePageChange(pagination.totalPages)}
                    className="px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {pagination.totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={handleNextPage}
              disabled={!pagination.hasNext}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={isModalOpen}
        onClose={handleCloseModal} // Ahora esta función existe
      />
    </div>
  )
}

export default Transactions
