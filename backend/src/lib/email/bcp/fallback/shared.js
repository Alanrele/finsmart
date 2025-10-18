const AMOUNT_PATTERNS = [
  { regex: /S\/\.?\s*([\d.,]+(?:\.\d{2})?)/i, currency: 'PEN' },
  { regex: /S\/\s*([\d.,]+(?:\.\d{2})?)/i, currency: 'PEN' },
  { regex: /SOLES?\s*([\d.,]+(?:\.\d{2})?)/i, currency: 'PEN' },
  { regex: /US\$?\s*([\d.,]+(?:\.\d{2})?)/i, currency: 'USD' },
  { regex: /\bUSD\s*([\d.,]+(?:\.\d{2})?)/i, currency: 'USD' },
  { regex: /\$\s*([\d.,]+(?:\.\d{2})?)/i, currency: 'USD' },
];

const MONTHS = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  setiembre: '09',
  septiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
};

function sanitizeNumber(numberStr) {
  if (!numberStr) {
    return null;
  }

  const cleaned = numberStr
    .replace(/\uFFFD/g, '')
    .replace(/[^\d.,-]/g, '')
    .trim();

  if (!cleaned) {
    return null;
  }

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized = cleaned;

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, '').replace(/,/g, '.');
    } else {
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (lastComma > -1) {
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      normalized = `${parts[0].replace(/\./g, '')}.${parts[1]}`;
    } else {
      normalized = cleaned.replace(/,/g, '');
    }
  } else {
    normalized = cleaned.replace(/,/g, '');
  }

  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

function extractAmountAndCurrency(text) {
  if (!text) {
    return null;
  }

  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern.regex);
    if (!match) {
      continue;
    }

    const amount = sanitizeNumber(match[1]);
    if (amount === null) {
      continue;
    }

    return {
      amount,
      currency: pattern.currency,
    };
  }

  return null;
}

function parseSpanishDate(rawDate) {
  if (!rawDate) {
    return null;
  }

  const normalized = rawDate
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\uFFFD/g, '')
    .trim();

  const datePattern = /(\d{1,2})\s+de\s+([A-Za-z]+)\s+de\s+(\d{4})(?:\s*[-\u2013]\s*|\s+a las\s+)?(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
  const match = normalized.match(datePattern);

  if (!match) {
    return null;
  }

  const [, dayStr, monthNameRaw, yearStr, hourStr, minuteStr, periodRaw] = match;
  const month = MONTHS[monthNameRaw.toLowerCase()];
  if (!month) {
    return null;
  }

  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  const period = periodRaw ? periodRaw.toUpperCase() : null;

  if (period === 'PM' && hour < 12) {
    hour += 12;
  } else if (period === 'AM' && hour === 12) {
    hour = 0;
  }

  const day = dayStr.padStart(2, '0');
  const hourFormatted = hour.toString().padStart(2, '0');
  const minuteFormatted = minute.toString().padStart(2, '0');

  return `${yearStr}-${month}-${day} ${hourFormatted}:${minuteFormatted}`;
}

function toIsoDateTime(dateString, fallback) {
  if (!dateString) {
    if (fallback) {
      const fallbackDate = new Date(fallback);
      if (!Number.isNaN(fallbackDate.getTime())) {
        return fallbackDate.toISOString();
      }
    }
    return new Date().toISOString();
  }

  const candidate = `${dateString}:00-05:00`.replace(' ', 'T');
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) {
    if (fallback) {
      const fallbackDate = new Date(fallback);
      if (!Number.isNaN(fallbackDate.getTime())) {
        return fallbackDate.toISOString();
      }
    }
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function sanitizeMerchantName(raw) {
  if (!raw) {
    return undefined;
  }

  let cleaned = raw
    .replace(/\uFFFD/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  cleaned = cleaned.replace(/(numero de operacion.*)$/i, '').trim();
  cleaned = cleaned.replace(/(no reconoces esta operacion\??.*)$/i, '').trim();
  cleaned = cleaned.replace(/(comunicate.*)$/i, '').trim();
  cleaned = cleaned.replace(/\(\d{1,4}\)\s*\d{2,4}[-\s]?\d{3,4}(?:\s*anexo\s*\*?\d+)?/gi, '').trim();
  cleaned = cleaned.replace(/\banexo\s+\*?\d+\b/gi, '').trim();
  cleaned = cleaned.replace(/[!?;:\-]+$/g, '').trim();
  cleaned = cleaned.replace(/,\s*$/g, '').trim();

  if (!cleaned) {
    return undefined;
  }

  return cleaned;
}

module.exports = {
  extractAmountAndCurrency,
  parseSpanishDate,
  toIsoDateTime,
  sanitizeMerchantName,
};

