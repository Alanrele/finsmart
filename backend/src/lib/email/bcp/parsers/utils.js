const { parseMoneyToCanonical, parseDateTimeLima } = require('../../normalize');

const LABEL_BOUNDARY_TOKENS = [
  'Monto de consumo',
  'Monto consumo',
  'Monto de compra',
  'Monto compra',
  'Monto de retiro',
  'Monto retiro',
  'Monto de la operacion',
  'Monto operacion',
  'Monto transferido',
  'Monto abonado',
  'Monto depositado',
  'Monto devuelto',
  'Monto pago',
  'Monto pagado',
  'Monto del consumo',
  'Total del consumo',
  'Total consumo',
  'Monto de comision',
  'Importe',
  'Tarjeta terminada',
  'Tarjeta numero',
  'Tarjeta n',
  'Cuenta origen',
  'Cuenta destino',
  'Cuenta abono',
  'Cuenta afectada',
  'Beneficiario',
  'Titular destino',
  'Numero de operacion',
  'Numero de operacin',
  'Nmero de operacion',
  'Nmero de operacin',
  'Operacion',
  'Operacin',
  'Fecha y hora',
  'Canal',
  'Servicio',
  'Motivo',
  'Motivo del cargo',
  'Origen',
  'Procedencia',
  'Ubicacion',
  'Ubicacin',
  'Cajero',
  'CCI',
  'Saldo disponible',
  'Codigo de cliente',
  'Cdigo de cliente',
  'Contrato',
  'Suministro',
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeForBoundary(label) {
  return escapeRegex(
    label
      .replace(/\uFFFD/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim(),
  ).replace(/\s+/g, '\\s+');
}

const LABEL_BOUNDARY_PATTERNS = LABEL_BOUNDARY_TOKENS
  .map(normalizeForBoundary)
  .sort((a, b) => b.length - a.length);

const LABEL_BOUNDARY_REGEX = LABEL_BOUNDARY_PATTERNS.length
  ? new RegExp(`\\s+(?:${LABEL_BOUNDARY_PATTERNS.join('|')}):`, 'i')
  : null;

function extractFirstMatch(text, patterns, groupIndex = 1) {
  const list = Array.isArray(patterns) ? patterns : [patterns];

  for (const pattern of list) {
    const match = text.match(pattern);
    if (match) {
      const rawValue = match[groupIndex] !== undefined ? match[groupIndex] : match[0];
      if (rawValue !== undefined && rawValue !== null) {
        let value = String(rawValue).trim();
        if (LABEL_BOUNDARY_REGEX) {
          const boundaryIndex = value.search(LABEL_BOUNDARY_REGEX);
          if (boundaryIndex > 0) {
            value = value.slice(0, boundaryIndex).trim();
          }
        }
        return value;
      }
    }
  }

  return null;
}

function parseAmount(text, patterns) {
  const list = Array.isArray(patterns) ? patterns : [patterns];

  for (const pattern of list) {
    const match = text.match(pattern);
    if (match) {
      const currencyLabel = match[1] || '';
      const rawValue = match[2] || match[1];
      if (!rawValue) {
        continue;
      }
      return parseMoneyToCanonical(currencyLabel, rawValue);
    }
  }

  return null;
}

function parseDate(text, patterns, defaultTime) {
  const list = Array.isArray(patterns) ? patterns : [patterns];

  for (const pattern of list) {
    const match = text.match(pattern);
    if (match) {
      const datePart = match[1] || match[0];
      const timePart = match[2] || defaultTime || undefined;
      if (datePart) {
        return parseDateTimeLima(datePart, timePart);
      }
    }
  }

  return null;
}

function computeConfidence(signals, target) {
  if (target <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, signals / target));
}

function sanitize(value) {
  if (value === null || value === undefined) {
    return undefined;
  }
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

module.exports = {
  extractFirstMatch,
  parseAmount,
  parseDate,
  computeConfidence,
  sanitize,
};
