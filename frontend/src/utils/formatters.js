/**
 * Utilidades para formateo de números y monedas
 */

// Configuración regional para Perú
const LOCALE = 'es-PE'
const CURRENCY = 'PEN'

/**
 * Formatea un número como moneda peruana
 * @param {number} amount - Cantidad a formatear
 * @param {boolean} showSign - Si mostrar el signo + o -
 * @returns {string} Cantidad formateada
 */
export const formatCurrency = (amount, showSign = false) => {
  if (amount == null || isNaN(amount)) return 'S/ 0.00'
  
  const absAmount = Math.abs(amount)
  const formatted = new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(absAmount)
  
  if (showSign) {
    return amount >= 0 ? `+${formatted}` : `-${formatted}`
  }
  
  return formatted
}

/**
 * Formatea números grandes de manera legible (K, M, B)
 * @param {number} num - Número a formatear
 * @returns {string} Número formateado
 */
export const formatNumber = (num) => {
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

/**
 * Formatea moneda con abreviación para números grandes
 * @param {number} amount - Cantidad a formatear
 * @returns {string} Cantidad formateada con abreviación
 */
export const formatCurrencyCompact = (amount) => {
  if (amount == null || isNaN(amount)) return 'S/ 0.00'
  
  const absAmount = Math.abs(amount)
  
  if (absAmount >= 1000000000) {
    return `S/ ${(absAmount / 1000000000).toFixed(1)}B`
  } else if (absAmount >= 1000000) {
    return `S/ ${(absAmount / 1000000).toFixed(1)}M`
  } else if (absAmount >= 1000) {
    return `S/ ${(absAmount / 1000).toFixed(1)}K`
  }
  
  return formatCurrency(amount)
}

/**
 * Formatea porcentajes
 * @param {number} percent - Porcentaje a formatear
 * @param {number} decimals - Número de decimales
 * @returns {string} Porcentaje formateado
 */
export const formatPercentage = (percent, decimals = 1) => {
  if (percent == null || isNaN(percent)) return '0.0%'
  
  return `${Math.abs(percent).toFixed(decimals)}%`
}

/**
 * Formatea fechas en formato legible
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
export const formatDate = (date) => {
  if (!date) return 'Sin fecha'
  
  const dateObj = new Date(date)
  
  if (isNaN(dateObj.getTime())) return 'Fecha inválida'
  
  return dateObj.toLocaleDateString(LOCALE, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Formatea fecha y hora completa
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} Fecha y hora formateada
 */
export const formatDateTime = (date) => {
  if (!date) return 'Sin fecha'
  
  const dateObj = new Date(date)
  
  if (isNaN(dateObj.getTime())) return 'Fecha inválida'
  
  return dateObj.toLocaleDateString(LOCALE, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Detecta si un número es demasiado grande para mostrarlo completo
 * @param {number} amount - Cantidad a verificar
 * @returns {boolean} True si es muy grande
 */
export const isLargeNumber = (amount) => {
  return Math.abs(amount) >= 100000 // 100K+
}

/**
 * Formatea automáticamente según el tamaño del número
 * @param {number} amount - Cantidad a formatear
 * @returns {string} Cantidad formateada apropiadamente
 */
export const formatCurrencyAuto = (amount) => {
  if (isLargeNumber(amount)) {
    return formatCurrencyCompact(amount)
  }
  return formatCurrency(amount)
}