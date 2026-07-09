import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react'
import { formatCurrency, formatDateTime } from '../../utils/formatters'

/*
  Detalle de un movimiento, estilo Kipu: hoja inferior en móvil / tarjeta
  centrada en escritorio, monto como héroe (Outfit), descripción en serif
  itálica y ficha tipo registro con micro-etiquetas mono. La "cuerda con
  nudo" del quipu separa el héroe de la ficha (un movimiento = un nudo).
*/

const INCOME_TYPES = ['credit', 'deposit', 'income']

const TYPE_LABELS = {
  credit: 'Abono',
  deposit: 'Depósito',
  income: 'Ingreso',
  debit: 'Cargo',
  withdrawal: 'Retiro',
  payment: 'Pago',
  transfer: 'Transferencia',
}

const CATEGORY_LABELS = {
  food: 'Comida',
  transport: 'Transporte',
  entertainment: 'Entretenimiento',
  shopping: 'Compras',
  healthcare: 'Salud',
  utilities: 'Servicios',
  education: 'Educación',
  travel: 'Viajes',
  investment: 'Inversiones',
  income: 'Ingresos',
  yape: 'Yape',
  transfer: 'Transferencias',
  other: 'Otros',
  unclassified: 'Sin clasificar',
  salary: 'Salario',
  savings: 'Ahorros',
  freelance: 'Freelance',
}

const CATEGORY_ICONS = {
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
  yape: '📱',
  transfer: '🔄',
  other: '📄',
}

const CHANNEL_LABELS = {
  web: 'Banca por internet',
  app: 'App móvil',
  atm: 'Cajero automático',
  pos: 'Punto de venta',
  agent: 'Agente',
  branch: 'Agencia',
  yape: 'Yape',
  plin: 'Plin',
  other: 'Otro',
}

// Respeta la moneda del movimiento (formatCurrency siempre asume soles)
const formatAmount = (amount, currency) => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount || 0))
  }
  return formatCurrency(amount)
}

/* Cuerda del quipu con su nudo: divisor de firma del detalle */
const QuipuDivider = ({ income }) => (
  <svg viewBox="0 0 320 14" className="w-full h-3.5 my-5" aria-hidden="true" fill="none" preserveAspectRatio="none">
    <line x1="0" y1="7" x2="320" y2="7" className="stroke-taupe-300 dark:stroke-taupe-600" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
    <circle cx="160" cy="7" r="5" className={income ? 'fill-sage-400' : 'fill-sand-300'} />
    <circle cx="160" cy="7" r="2" className="fill-card" />
  </svg>
)

/* Fila de la ficha: micro-etiqueta a la izquierda, valor a la derecha */
const DetailRow = ({ label, children }) => (
  <div className="flex items-baseline justify-between gap-6 py-2.5">
    <dt className="micro-label shrink-0">{label}</dt>
    <dd className="text-sm font-medium text-main text-right min-w-0 break-words">{children}</dd>
  </div>
)

const TransactionDetailModal = ({ transaction, isOpen, onClose }) => {
  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!transaction) return null

  const isIncome = INCOME_TYPES.includes(transaction.type)
  const isTransfer = transaction.type === 'transfer'
  const typeLabel = TYPE_LABELS[transaction.type] || transaction.type
  const categoryKey = (transaction.category || '').toLowerCase()
  const categoryLabel = CATEGORY_LABELS[categoryKey] || transaction.category || 'Otros'
  const categoryIcon = CATEGORY_ICONS[categoryKey]
  const channelLabel = transaction.channel ? (CHANNEL_LABELS[transaction.channel] || transaction.channel) : null
  const txId = transaction.id || transaction._id
  const TypeIcon = isTransfer ? ArrowLeftRight : isIncome ? TrendingUp : TrendingDown

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          {/* Fondo */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Hoja / tarjeta */}
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tx-detail-title"
            className="relative w-full sm:max-w-md bg-card border border-subtle rounded-t-3xl sm:rounded-[2rem] shadow-xl safe-area-bottom max-h-[88vh] flex flex-col"
          >
            {/* Encabezado */}
            <div className="flex items-start justify-between px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${
                  isTransfer
                    ? 'bg-primary/10 text-primary dark:text-primary-300'
                    : isIncome
                      ? 'bg-sage-600/10 text-sage-700 dark:text-sage-300'
                      : 'bg-rose-500/10 text-rose-500'
                }`}>
                  <TypeIcon className="w-5 h-5" strokeWidth={2.25} />
                </div>
                <span className="eyebrow">Movimiento</span>
              </div>
              <button
                onClick={onClose}
                autoFocus
                aria-label="Cerrar detalle"
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:bg-base transition focus-ring"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido */}
            <div className="px-6 pb-6 overflow-y-auto">
              {/* Héroe: monto + descripción */}
              <div className="mt-5">
                <p className={`font-display text-4xl font-bold tracking-tight tabular-nums ${
                  isIncome ? 'text-sage-600 dark:text-sage-300' : 'text-main'
                }`}>
                  {isIncome ? '+' : '−'}{formatAmount(transaction.amount, transaction.currency)}
                </p>
                <h2 id="tx-detail-title" className="mt-2 text-lg font-serif italic text-main leading-snug">
                  {transaction.description || transaction.merchant || 'Movimiento bancario'}
                </h2>
                <p className="mt-1 text-xs text-muted first-letter:uppercase">{formatDateTime(transaction.date)}</p>
              </div>

              <QuipuDivider income={isIncome} />

              {/* Ficha del movimiento */}
              <dl className="divide-y divide-subtle">
                <DetailRow label="Tipo">
                  <span className={isTransfer ? 'badge-info' : isIncome ? 'badge-success' : 'badge-danger'}>
                    {typeLabel}
                  </span>
                </DetailRow>

                <DetailRow label="Categoría">
                  {categoryIcon && <span className="mr-1.5" aria-hidden="true">{categoryIcon}</span>}
                  {categoryLabel}
                </DetailRow>

                {transaction.balance != null && (
                  <DetailRow label="Saldo después">
                    <span className="tabular-nums">{formatAmount(transaction.balance, transaction.currency)}</span>
                  </DetailRow>
                )}

                {transaction.merchant && <DetailRow label="Comercio">{transaction.merchant}</DetailRow>}
                {channelLabel && <DetailRow label="Canal">{channelLabel}</DetailRow>}
                {transaction.location && <DetailRow label="Ubicación">{transaction.location}</DetailRow>}
                {transaction.account && <DetailRow label="Cuenta">{transaction.account}</DetailRow>}
                {transaction.cardNumber && <DetailRow label="Tarjeta">{transaction.cardNumber}</DetailRow>}
                {transaction.operationNumber && (
                  <DetailRow label="Nº de operación">
                    <span className="font-mono text-xs">{transaction.operationNumber}</span>
                  </DetailRow>
                )}
                {transaction.reference && <DetailRow label="Referencia">{transaction.reference}</DetailRow>}

                {(transaction.origin === 'pdf' && transaction.sourceFile) ? (
                  <DetailRow label="Origen">Estado de cuenta · {transaction.sourceFile}</DetailRow>
                ) : transaction.origin === 'email' ? (
                  <DetailRow label="Origen">Notificación del correo</DetailRow>
                ) : null}

                {transaction.notes && <DetailRow label="Notas">{transaction.notes}</DetailRow>}
              </dl>

              {/* Registro del sistema */}
              {(txId || transaction.createdAt) && (
                <div className="mt-5 pt-4 border-t border-subtle space-y-1">
                  {transaction.createdAt && (
                    <p className="font-mono text-[10px] tracking-wide text-muted">
                      Registrado el {formatDateTime(transaction.createdAt)}
                    </p>
                  )}
                  {txId && (
                    <p className="font-mono text-[10px] tracking-wide text-muted break-all">ID {txId}</p>
                  )}
                </div>
              )}

              <button onClick={onClose} className="btn-secondary w-full mt-6">
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
