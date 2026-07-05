import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { Search, Filter, Calendar, Download, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, ChevronLeft, ChevronRight, X, SearchX, FileText, Tag } from 'lucide-react'
import { getTransactions } from '../services/api' // Importar directamente la función
import toast from 'react-hot-toast'
import LoadingCard from '../components/common/LoadingCard'
import TransactionDetailModal from '../components/transactions/TransactionDetailModal'
import { formatCurrency, formatCurrencyAuto } from '../utils/formatters'
import { PageHeader, SectionCard, Segmented, TextInput, SelectInput, Chip, EmptyState, IconBadge } from '../components/ui/kit'

const EMPTY_FILTERS = { search: '', category: '', type: '', startDate: '', endDate: '', page: 1, limit: 20 }

const Transactions = () => {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false
  })
  const [extensionWarningShown, setExtensionWarningShown] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchParams] = useSearchParams()
  // Filtro inicial desde la URL (p. ej. el enlace "Resolver" del dashboard: ?category=unclassified)
  const [filters, setFilters] = useState(() => {
    const category = searchParams.get('category')
    return category ? { ...EMPTY_FILTERS, category } : EMPTY_FILTERS
  })

  // Debounce: la búsqueda que se escribe solo dispara una consulta 400ms
  // después de dejar de teclear (antes: una petición por carácter).
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(prev => (prev.search === searchInput ? prev : { ...prev, search: searchInput, page: 1 }))
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const hasActiveFilters = Boolean(
    filters.search || filters.category || filters.type || filters.startDate || filters.endDate
  )

  const clearFilters = () => {
    setSearchInput('')
    setFilters(EMPTY_FILTERS)
  }

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
    { value: 'other', label: 'Otros' },
    { value: 'unclassified', label: 'Sin clasificar' }
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
      'unclassified': 'Sin clasificar',
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

  const isIncomeTx = (t: any) => t.type === 'credit' || t.type === 'deposit'
  const signedAmount = (t: any) => formatCurrency(isIncomeTx(t) ? Math.abs(t.amount) : -Math.abs(t.amount), true)

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
      {/* PageHeader */}
      <PageHeader
        title="Transacciones"
        subtitle={
          pagination.totalCount > 0
            ? `${pagination.totalCount} movimiento${pagination.totalCount === 1 ? '' : 's'}${hasActiveFilters ? ' con los filtros aplicados' : ''}`
            : 'Registra, administra y audita todos tus movimientos financieros'
        }
        actions={hasActiveFilters ? (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-bold uppercase tracking-wide border border-brand-primary/20 transition-all cursor-pointer"
          >
            <X size={14} />
            Limpiar filtros
          </button>
        ) : undefined}
      />

      {/* FilterBar inline (patrón Kipu) */}
      <div className="bg-card p-5 rounded-[2rem] border border-subtle shadow-xl flex flex-col md:flex-row gap-4 md:items-center">
        {/* Búsqueda */}
        <div className="relative w-full md:flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por descripción o comercio..."
            className="w-full pl-10 pr-4 py-2.5 bg-base/50 border border-subtle rounded-xl text-sm text-main placeholder-muted focus:outline-none focus:border-brand-primary focus:bg-base transition-all"
          />
        </div>

        {/* Segmented de tipo */}
        <Segmented
          className="w-full md:w-auto"
          value={filters.type}
          onChange={(v) => setFilters({ ...filters, type: v, page: 1 })}
          options={[
            { value: '', label: 'Todos' },
            { value: 'income', label: 'Ingresos' },
            { value: 'expense', label: 'Gastos' },
          ]}
        />

        {/* Categoría */}
        <div className="relative w-full md:w-52">
          <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted z-10" />
          <SelectInput
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
            className="pl-9 py-2.5 text-xs font-bold"
          >
            <option value="">Categorías (Todas)</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </SelectInput>
        </div>

        {/* Rango de fechas */}
        <div className="flex gap-2 w-full md:w-auto">
          <TextInput type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })} className="py-2.5 text-xs" />
          <TextInput type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })} className="py-2.5 text-xs" />
        </div>
      </div>

      {/* Card con tabla responsive (mobile: card-list / desktop: table) */}
      <div className="bg-card rounded-[2.5rem] border border-subtle shadow-xl overflow-hidden">
        {!transactions || transactions.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              icon={SearchX}
              title="Sin resultados"
              message="Ninguna transacción coincide con los filtros aplicados. Prueba a ampliar el rango o limpiar la búsqueda."
              action={
                <button onClick={clearFilters} className="flex items-center gap-1.5 bg-brand-primary hover:opacity-90 text-white dark:text-brand-dark px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wide shadow-lg cursor-pointer transition-all">
                  Limpiar filtros
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="Aún no hay movimientos"
              message="Conecta tu correo de Outlook o sube un PDF para que Kipu registre las notificaciones del BCP."
            />
          )
        ) : (
          <>
            {/* Móvil: lista de cards */}
            <div className="block md:hidden divide-y divide-subtle">
              {transactions.map((tx) => (
                <div
                  key={tx._id}
                  onClick={() => handleTransactionClick(tx)}
                  className="p-4 flex items-center justify-between hover:bg-base/20 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <IconBadge icon={isIncomeTx(tx) ? ArrowUpRight : ArrowDownLeft} accent={isIncomeTx(tx) ? 'emerald' : 'rose'} size={14} className="rounded-xl p-2" />
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-main block truncate">{tx.description || tx.merchant || 'Transacción'}</span>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] text-muted font-mono">{new Date(tx.date).toLocaleDateString()}</span>
                        {tx.category && <Chip>{translateCategory(tx.category)}</Chip>}
                      </div>
                    </div>
                  </div>
                  <span className={`text-sm font-extrabold font-display whitespace-nowrap pl-2 ${isIncomeTx(tx) ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {signedAmount(tx)}
                  </span>
                </div>
              ))}
            </div>

            {/* Escritorio: tabla estructurada */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-base/40 text-[10px] font-bold text-muted uppercase tracking-widest border-b border-subtle">
                    <th className="py-4 px-6 font-mono">Detalle</th>
                    <th className="py-4 px-6 font-mono">Fecha</th>
                    <th className="py-4 px-6 font-mono">Categoría</th>
                    <th className="py-4 px-6 font-mono">Canal</th>
                    <th className="py-4 px-6 text-right font-mono">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {transactions.map((tx) => (
                    <tr key={tx._id} onClick={() => handleTransactionClick(tx)} className="hover:bg-base/40 transition-all group cursor-pointer">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <IconBadge icon={isIncomeTx(tx) ? ArrowUpRight : ArrowDownLeft} accent={isIncomeTx(tx) ? 'emerald' : 'rose'} size={16} className="rounded-xl p-2" />
                          <span className="text-sm font-semibold text-main group-hover:text-brand-primary transition-colors truncate max-w-xs block">
                            {tx.description || tx.merchant || 'Transacción'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-muted font-mono whitespace-nowrap">{new Date(tx.date).toLocaleDateString()}</td>
                      <td className="py-4 px-6"><Chip icon={Tag}>{translateCategory(tx.category)}</Chip></td>
                      <td className="py-4 px-6 text-xs text-muted capitalize">{tx.channel}</td>
                      <td className="py-4 px-6 text-right font-extrabold font-display text-sm whitespace-nowrap">
                        <span className={isIncomeTx(tx) ? 'text-emerald-500' : 'text-rose-500'}>{signedAmount(tx)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted font-mono">
            Mostrando {transactions.length} de {pagination.totalCount} transacciones
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={!pagination.hasPrev}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-base/60 border border-subtle text-xs font-bold text-main hover:bg-base disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <div className="flex items-center gap-1">
              {(() => {
                const maxButtons = 5
                const half = Math.floor(maxButtons / 2)
                const total = pagination.totalPages
                const current = pagination.currentPage
                let startPage = Math.max(1, current - half)
                let endPage = Math.min(total, startPage + maxButtons - 1)
                startPage = Math.max(1, Math.min(startPage, endPage - maxButtons + 1))
                const buttons: React.ReactElement[] = []
                for (let p = startPage; p <= endPage; p++) {
                  buttons.push(
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-9 h-9 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        p === current ? 'bg-brand-primary text-white dark:text-brand-dark shadow-sm' : 'text-muted hover:text-main hover:bg-base/60'
                      }`}
                    >
                      {p}
                    </button>
                  )
                }
                return buttons
              })()}
            </div>
            <button
              onClick={handleNextPage}
              disabled={!pagination.hasNext}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-base/60 border border-subtle text-xs font-bold text-main hover:bg-base disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Siguiente <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal de detalle */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </motion.div>
  )
}

export default Transactions
