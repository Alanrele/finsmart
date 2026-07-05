/**
 * Utilidades para formateo de números y monedas.
 * Migrado a TypeScript (comportamiento en runtime idéntico).
 */

// Configuración regional para Perú
const LOCALE = 'es-PE'
const CURRENCY = 'PEN'

type Numeric = number | null | undefined
type DateInput = string | number | Date | null | undefined

/** Formatea un número como moneda peruana. `showSign` antepone + / -. */
export const formatCurrency = (amount: Numeric, showSign = false): string => {
  if (amount == null || isNaN(amount)) return 'S/ 0.00'

  const absAmount = Math.abs(amount)
  const formatted = new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount)

  if (showSign) {
    return amount >= 0 ? `+${formatted}` : `-${formatted}`
  }

  return formatted
}

/** Formatea números grandes de manera legible (K, M, B). */
export const formatNumber = (num: Numeric): string => {
  if (num == null || isNaN(num)) return '0'

  const absNum = Math.abs(num)

  if (absNum >= 1000000000) {
    return (absNum / 1000000000).toFixed(1) + 'B'
  } else if (absNum >= 1000000) {
    return (absNum / 1000000).toFixed(1) + 'M'
  } else if (absNum >= 1000) {
    return (absNum / 1000).toFixed(1) + 'K'
  }

  return absNum.toLocaleString(LOCALE)
}

/** Formatea moneda con abreviación para números grandes. */
export const formatCurrencyCompact = (amount: Numeric): string => {
  if (amount == null || isNaN(amount)) return 'S/ 0.00'

  const absAmount = Math.abs(amount)

  if (absAmount >= 1000000000) {
    const billions = absAmount / 1000000000
    return `S/ ${billions < 10 ? billions.toFixed(2) : billions.toFixed(1)}B`
  } else if (absAmount >= 1000000) {
    const millions = absAmount / 1000000
    return `S/ ${millions < 10 ? millions.toFixed(2) : millions.toFixed(1)}M`
  } else if (absAmount >= 1000) {
    const thousands = absAmount / 1000
    return `S/ ${thousands < 10 ? thousands.toFixed(1) : thousands.toFixed(0)}K`
  }

  return formatCurrency(amount)
}

/** Formatea porcentajes. */
export const formatPercentage = (percent: Numeric, decimals = 1): string => {
  if (percent == null || isNaN(percent)) return '0.0%'

  return `${Math.abs(percent).toFixed(decimals)}%`
}

/** Formatea fechas en formato legible. */
export const formatDate = (date: DateInput): string => {
  if (!date) return 'Sin fecha'

  const dateObj = new Date(date)

  if (isNaN(dateObj.getTime())) return 'Fecha inválida'

  return dateObj.toLocaleDateString(LOCALE, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Formatea fecha y hora completa. */
export const formatDateTime = (date: DateInput): string => {
  if (!date) return 'Sin fecha'

  const dateObj = new Date(date)

  if (isNaN(dateObj.getTime())) return 'Fecha inválida'

  return dateObj.toLocaleDateString(LOCALE, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Detecta si un número es demasiado grande para mostrarlo completo. */
export const isLargeNumber = (amount: number): boolean => {
  return Math.abs(amount) >= 10000 // 10K+ - umbral bajo para mejor legibilidad
}

/** Formatea automáticamente según el tamaño del número. */
export const formatCurrencyAuto = (amount: Numeric): string => {
  if (amount == null || isNaN(amount)) return 'S/ 0.00'

  // Redondear para evitar problemas de precisión
  const roundedAmount = Math.round(amount * 100) / 100

  if (isLargeNumber(roundedAmount)) {
    return formatCurrencyCompact(roundedAmount)
  }
  return formatCurrency(roundedAmount)
}

/** Formatea números extremadamente grandes de manera ultra-compacta. */
export const formatCurrencyUltraCompact = (amount: Numeric): string => {
  if (amount == null || isNaN(amount)) return 'S/ 0'

  const absAmount = Math.abs(amount)

  if (absAmount >= 1000000000000) {
    return `S/ ${(absAmount / 1000000000000).toFixed(1)}T`
  } else if (absAmount >= 1000000000) {
    return `S/ ${(absAmount / 1000000000).toFixed(1)}B`
  } else if (absAmount >= 1000000) {
    return `S/ ${(absAmount / 1000000).toFixed(1)}M`
  } else if (absAmount >= 1000) {
    return `S/ ${(absAmount / 1000).toFixed(0)}K`
  }

  return `S/ ${Math.round(absAmount)}`
}
