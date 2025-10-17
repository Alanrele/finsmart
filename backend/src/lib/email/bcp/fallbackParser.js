const cheerio = require('cheerio');
const { normalizeEmailBody } = require('../normalize');

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
    return fallback ? new Date(fallback).toISOString() : new Date().toISOString();
  }

  // Assume Lima timezone when not specified
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

function inferTemplate({ operationType, sendingType, paymentType, merchant, channel, fullText }) {
  const haystack = [
    operationType,
    sendingType,
    paymentType,
    merchant,
    channel,
    fullText,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/transferencia|envio|cci/.test(haystack)) {
    return 'account_transfer';
  }

  if (/servicio|pago de servicio|recibo|factura/.test(haystack)) {
    return 'service_payment';
  }

  if (/compra|consumo/.test(haystack)) {
    return 'card_purchase';
  }

  if (/retiro|cajero/.test(haystack)) {
    return 'atm_withdrawal';
  }

  if (/abono|deposito|ingreso|devolucion/.test(haystack)) {
    return 'incoming_credit';
  }

  if (/comision|cargo por servicio/.test(haystack)) {
    return 'fee_commission';
  }

  return 'account_transfer';
}

function collectFieldsFromHtml(html) {
  if (!html) {
    return {};
  }

  const fields = {};
  const $ = cheerio.load(html);

  $('table tr').each((_, row) => {
    const $row = $(row);
    const $cells = $row.find('td');
    if ($cells.length < 2) {
      return;
    }

    const label = $cells
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim();

    let value = $cells
      .last()
      .text()
      .replace(/\s+/g, ' ')
      .trim();

    value = value.replace(/\*\*\*\*\s*/g, '').split('\n')[0].trim();
    const normalizedLabel = label.toLowerCase();
    const labelAscii = normalizedLabel.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (labelAscii.includes('fecha y hora')) {
      fields.date = parseSpanishDate(value) || fields.date;
    } else if (labelAscii.includes('banco destino')) {
      fields.bankDest = value;
    } else if (
      labelAscii.includes('numero de operacion')
      || labelAscii.includes('operacion')
    ) {
      fields.operationNumber = value;
    } else if (labelAscii.includes('canal')) {
      fields.channel = value;
    } else if (labelAscii.includes('desde')) {
      const match = value.match(/(\d{4})$/);
      if (match) {
        fields.originAccount = match[1];
      }
    } else if (labelAscii.includes('enviado a') || labelAscii.includes('beneficiario')) {
      fields.beneficiary = value.replace(/\s*\d{4}$/, '').trim();
    } else if (labelAscii.includes('operacion realizada')) {
      fields.operationType = value;
    } else if (labelAscii.includes('tipo de envio')) {
      fields.sendingType = value;
    } else if (labelAscii.includes('pagado a')) {
      const match = value.match(/(\d{4})$/);
      if (match) {
        fields.cardLast4 = match[1];
      }
      fields.merchant = value.replace(/(\d{4})$/, '').trim();
    } else if (labelAscii.includes('tipo de pago')) {
      fields.paymentType = value;
    } else if (
      labelAscii.includes('numero de tarjeta de debito')
      || labelAscii.includes('tarjeta')
    ) {
      const match = value.match(/(\d{4})$/);
      if (match) {
        fields.cardLast4 = match[1];
      }
    } else if (labelAscii.includes('empresa') || labelAscii.includes('comercio')) {
      fields.merchant = value;
    }
  });

  if (!fields.amountInfo) {
    $('b, strong').each((_, el) => {
      const text = $(el).text();
      const amountInfo = extractAmountAndCurrency(text);
      if (amountInfo) {
        fields.amountInfo = amountInfo;
        return false;
      }
      return undefined;
    });
  }

  return fields;
}

function enrichFieldsFromText(fields, html, text) {
  if (!fields.amountInfo) {
    fields.amountInfo = extractAmountAndCurrency(html) || extractAmountAndCurrency(text);
  }

  const normalizedText = normalizeEmailBody(text || html || '');
  if (!fields.date) {
    fields.date = parseSpanishDate(normalizedText);
  }

  if (!fields.operationType) {
    const match = normalizedText.match(/operaci[oó]n (?:realizada|tipo):?\s*([^\n]+)/i);
    if (match) {
      fields.operationType = match[1].trim();
    }
  }

  if (!fields.operationNumber) {
    const match = normalizedText.match(/n[uú]mero de operaci[oó]n[:\s]+([A-Za-z0-9-]+)/i);
    if (match) {
      fields.operationNumber = match[1].trim();
    }
  }

  if (!fields.channel) {
    const match = normalizedText.match(/canal[:\s]+([^\n]+)/i);
    if (match) {
      fields.channel = match[1].trim();
    }
  }

  if (!fields.beneficiary) {
    const match = normalizedText.match(/beneficiario[:\s]+([^\n]+)/i);
    if (match) {
      fields.beneficiary = match[1].trim();
    }
  }

  return {
    ...fields,
    normalizedText,
  };
}

function buildNormalizedTransaction(fields, context) {
  const { receivedAt } = context;
  const { amountInfo, normalizedText } = fields;
  if (!amountInfo) {
    return null;
  }

  const occurredAt = toIsoDateTime(fields.date, receivedAt);
  const template = inferTemplate({
    operationType: fields.operationType,
    sendingType: fields.sendingType,
    paymentType: fields.paymentType,
    merchant: fields.merchant,
    channel: fields.channel,
    fullText: normalizedText,
  });

  const notes = [];
  if (fields.beneficiary) {
    notes.push(`Beneficiario: ${fields.beneficiary}`);
  }
  if (fields.bankDest) {
    notes.push(`Banco destino: ${fields.bankDest}`);
  }

  let confidence = 0.6;
  if (fields.date) {
    confidence += 0.1;
  }
  if (fields.operationNumber) {
    confidence += 0.1;
  }
  if (fields.operationType || fields.merchant) {
    confidence += 0.1;
  }
  confidence = Math.max(0.7, Math.min(0.95, confidence));

  return {
    source: 'BCP',
    template,
    occurredAt,
    amount: {
      value: amountInfo.amount.toFixed(2),
      currency: amountInfo.currency,
    },
    exchangeRate: {
      used: false,
    },
    balanceAfter: undefined,
    channel: fields.channel,
    merchant: fields.merchant,
    location: undefined,
    cardLast4: fields.cardLast4,
    accountRef: fields.originAccount,
    operationId: fields.operationNumber,
    notes: notes.length > 0 ? notes.join(' | ') : undefined,
    confidence,
  };
}

function fallbackParseBcpEmail({ subject, html, text, receivedAt }) {
  const hasHtml = html && /<\s*(html|body|table)/i.test(html);
  const fieldsFromHtml = hasHtml ? collectFieldsFromHtml(html) : {};
  const enrichedFields = enrichFieldsFromText(fieldsFromHtml, html, text);

  const transaction = buildNormalizedTransaction(
    enrichedFields,
    {
      subject,
      receivedAt,
    },
  );

  if (!transaction) {
    return null;
  }

  return {
    version: 'v2',
    success: true,
    template: transaction.template,
    transaction,
    confidence: transaction.confidence,
    notes: ['cheerio_fallback_parser'],
  };
}

module.exports = {
  fallbackParseBcpEmail,
  extractAmountAndCurrency,
  parseSpanishDate,
};
