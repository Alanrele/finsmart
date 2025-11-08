const cheerio = require('cheerio');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const LIMA_OFFSET = '-05:00';

function normalizeEmailBody(htmlOrText) {
  if (!htmlOrText) {
    return '';
  }

  const raw = String(htmlOrText);
  const likelyHtml = /<([a-z][\s\S]*?)>/i.test(raw);
  let text = raw;

  if (likelyHtml) {
    const $ = cheerio.load(raw);
    text = $('body').text();
  }

  const normalizedText = text
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\uFFFD/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const DISCLAIMER_PATTERNS = [
    /recuerda\s+a\s+traves/i,
    /juntos\s+somos\s+mas\s+seguros/i,
    /nuestros\s+correos\s+personalizados/i,
    /para\s+conocer\s+mas\s+sobre\s+las\s+principales/i,
    /si\s+deseas\s+desafiliarte/i,
  ];

  const LABELS = [
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
    'Monto del pago',
    'Monto pagado',
    'Monto total pagado',
    'Monto total',
    'Monto total cobrado',
    'Monto enviado',
    'Monto del consumo',
    'Total del consumo',
    'Total consumo',
    'Total cobrado',
    'Total cobrado al tipo de cambio',
    'Total devuelto',
    'Monto de comision',
    'Importe',
    'Tarjeta terminada',
    'Tarjeta numero',
    'Tarjeta n',
    'Numero de Tarjeta',
    'Nombre del Comercio',
    'Cuenta origen',
    'Cuenta destino',
    'Cuenta abono',
    'Cuenta afectada',
    'Desde',
    'Enviado a',
    'Banco destino',
    'Beneficiario',
    'Titular destino',
    'Titular del servicio',
    'Numero de operacion',
    'Numero de operacin',
    'Nmero de operacion',
    'Nmero de operacin',
    'Operacion',
    'Operacin',
    'Fecha y hora',
    'Canal',
    'Servicio',
    'Tipo de envio',
    'Tipo de cambio',
    'Motivo del cargo',
    'Motivo',
    'Ubicacion',
    'Ubicacin',
    'Cajero',
    'CCI',
    'Saldo disponible',
    'Codigo de cliente',
    'Cdigo de cliente',
    'Codigo de usuario',
    'Contrato',
    'Suministro',
    'Origen'
  ];

  const cleaned = normalizedText.replace(/\n+/g, ' ');

  let disclaimerCleaned = cleaned;
  DISCLAIMER_PATTERNS.forEach((pattern) => {
    const match = disclaimerCleaned.match(pattern);
    if (match && match.index >= 0) {
      disclaimerCleaned = disclaimerCleaned.slice(0, match.index).trim();
    }
  });

  let segmented = disclaimerCleaned;
  LABELS.forEach((label) => {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let regex;
    if (label === 'Operacion' || label === 'Operacin') {
      regex = new RegExp(`(?<!Numero\\s+de\\s+)(?<!Nmero\\s+de\\s+)${escapedLabel}:`, 'gi');
    } else if (label === 'Origen') {
      regex = new RegExp(`(?<!Cuenta\\s+)${escapedLabel}:`, 'gi');
    } else if (label === 'Motivo') {
      regex = new RegExp(`${escapedLabel}(?!\\s+del\\s+cargo):`, 'gi');
    } else {
      regex = new RegExp(`${escapedLabel}:`, 'gi');
    }
    segmented = segmented.replace(regex, (match) => `\n${match.trimStart()}`);
  });
  segmented = segmented
    .replace(/-\n/g, '- ')
    .replace(/\n{2,}/g, '\n')
    .replace(/^\n+/, '');

  return segmented
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

function detectCurrency(label) {
  const safeLabel = (label || '').toUpperCase();
  if (/USD|US\$|\$/.test(safeLabel)) {
    return 'USD';
  }
  if (/PEN|S\//.test(safeLabel) || /SOLES/.test(safeLabel)) {
    return 'PEN';
  }
  return 'PEN';
}

function normalizeNumericString(value) {
  let working = value.replace(/[^0-9.,-]/g, '');

  if (!working) {
    throw new Error('Empty monetary value');
  }

  const lastComma = working.lastIndexOf(',');
  const lastDot = working.lastIndexOf('.');

  if (lastComma !== -1 && lastComma > lastDot) {
    working = working.replace(/\./g, '');
    working = working.replace(',', '.');
  } else {
    working = working.replace(/,/g, '');
  }

  return working;
}

function canonicalizeDecimal(raw) {
  let value = raw;
  if (!value.includes('.')) {
    value = `${value}.00`;
  }

  const [intPartRaw, decimalPartRaw = '00'] = value.split('.');
  const sign = intPartRaw.startsWith('-') ? '-' : '';
  const unsignedInt = intPartRaw.replace(/^-/, '');
  const intPart = unsignedInt.replace(/^0+(?=\d)/, '') || '0';
  let decimalPart = decimalPartRaw;

  if (decimalPart.length === 0) {
    decimalPart = '00';
  } else if (decimalPart.length === 1) {
    decimalPart = `${decimalPart}0`;
  }

  return `${sign}${intPart}.${decimalPart}`;
}

function parseMoneyToCanonical(currencyLabel, raw) {
  if (!raw) {
    throw new Error('Amount text is required');
  }

  const currency = detectCurrency(`${currencyLabel || ''} ${raw}`);
  const normalizedNumber = normalizeNumericString(raw);
  const value = canonicalizeDecimal(normalizedNumber);

  return {
    currency,
    value,
  };
}

function parseTimeComponents(timeStr) {
  if (!timeStr) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }

  const normalized = timeStr
    .replace(/p\.?\s*m\.?/gi, 'PM')
    .replace(/a\.?\s*m\.?/gi, 'AM')
    .replace(/\./g, '')
    .trim();

  const match = normalized.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  const meridian = match[4] ? match[4].toUpperCase() : null;

  if (meridian === 'PM' && hours < 12) {
    hours += 12;
  } else if (meridian === 'AM' && hours === 12) {
    hours = 0;
  }

  return { hours, minutes, seconds };
}

function extractDateParts(dateStr) {
  const trimmed = dateStr.trim();

  const slashMatch = trimmed.match(/(\d{1,2})[\/](\d{1,2})[\/](\d{2,4})/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10);
    const rawYear = slashMatch[3];
    const year = rawYear.length === 2 ? parseInt(`20${rawYear}`, 10) : parseInt(rawYear, 10);
    return { year, month, day };
  }

  const dashMatch = trimmed.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dashMatch) {
    return {
      year: parseInt(dashMatch[1], 10),
      month: parseInt(dashMatch[2], 10),
      day: parseInt(dashMatch[3], 10),
    };
  }

  throw new Error('Unsupported date format');
}

function parseDateTimeLima(dateStr, timeStr) {
  if (!dateStr) {
    throw new Error('dateStr is required');
  }

  let datePart = dateStr;
  let timePart = timeStr;

  if (!timePart) {
    const timeWithinDate = dateStr.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]\.?M\.?)?)/i);
    if (timeWithinDate) {
      timePart = timeWithinDate[1];
      datePart = dateStr.replace(timeWithinDate[0], '').trim();
    }
  }

  const { year, month, day } = extractDateParts(datePart);
  const { hours, minutes, seconds } = parseTimeComponents(timePart);

  const pad = (value) => value.toString().padStart(2, '0');

  const isoString = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}${LIMA_OFFSET}`;
  // Validate using dayjs, but return the canonical ISO string to avoid double conversions.
  if (!dayjs.tz(isoString, 'America/Lima').isValid()) {
    throw new Error('Invalid date produced for Lima timezone');
  }
  return isoString;
}

module.exports = {
  normalizeEmailBody,
  parseMoneyToCanonical,
  parseDateTimeLima,
};




