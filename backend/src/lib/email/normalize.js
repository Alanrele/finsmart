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

  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\u00a0/g, ' ')
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
  return dayjs.tz(isoString, 'America/Lima').format();
}

module.exports = {
  normalizeEmailBody,
  parseMoneyToCanonical,
  parseDateTimeLima,
};

