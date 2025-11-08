const { parseMoneyToCanonical, parseDateTimeLima } = require('../../normalize');
const { extractFirstMatch, sanitize, compactObject } = require('./utils');

const MONTH_MAP = {
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

const AMOUNT_PATTERNS = [
  /Monto(?:\s+(?:de|del))?\s+consumo:?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
  /Total\s+(?:del\s+)?consumo:?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
  /Total\s+(?:del\s+)?consumo[\s:-]*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
  /Importe:?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
];

function parseAmount(text, notes, confidenceCounter) {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      try {
        const parsed = parseMoneyToCanonical(match[1], match[2]);
        confidenceCounter.value += 1;
        return parsed;
      } catch (error) {
        notes.push(`amount_parse_error: ${error.message}`);
        return null;
      }
    }
  }
  notes.push('amount_not_found');
  return null;
}

function parseTextualDate(text) {
  const match = text.match(/Fecha\s+y\s+hora:?\s*(\d{1,2})\s+de\s+([a-z\u00f1]+)\s+de\s+(\d{4})(?:\s*[-�?"]?\s*(\d{1,2}:\d{2}(?:\s*(?:a\.m\.|p\.m\.|am|pm|AM|PM))?))?/i);
  if (!match) {
    return null;
  }
  const day = match[1].padStart(2, '0');
  const monthKey = match[2].toLowerCase();
  const year = match[3];
  const timePart = match[4];

  const month = MONTH_MAP[monthKey];
  if (!month) {
    return null;
  }

  const datePart = `${day}/${month}/${year}`;
  try {
    return parseDateTimeLima(datePart, timePart);
  } catch {
    return null;
  }
}

function parseOccurredAt(text, options, notes, confidenceCounter) {
  const numericMatch =
    text.match(/Fecha\s+y\s+hora:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})(?:\s+(\d{1,2}:\d{2}(?:\s*(?:a\.m\.|p\.m\.|am|pm|AM|PM))?))?/i) ||
    text.match(/Fecha:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})(?:\s+(\d{1,2}:\d{2}(?:\s*(?:a\.m\.|p\.m\.|am|pm|AM|PM))?))?/i);

  if (numericMatch) {
    try {
      const occurred = parseDateTimeLima(numericMatch[1], numericMatch[2]);
      confidenceCounter.value += 1;
      return occurred;
    } catch (error) {
      notes.push(`datetime_parse_error: ${error.message}`);
    }
  }

  const textual = parseTextualDate(text);
  if (textual) {
    confidenceCounter.value += 1;
    return textual;
  }

  if (options.receivedAt) {
    notes.push('datetime_fallback_received_at');
    return options.receivedAt;
  }

  notes.push('datetime_not_found');
  return null;
}

function parseCardPurchase(text, options = {}) {
  const notes = [];
  const confidenceCounter = { value: 0 };
  const signalsTarget = 4;

  const amount = parseAmount(text, notes, confidenceCounter);
  const occurredAt = parseOccurredAt(text, options, notes, confidenceCounter);

  const cardLast4 =
    extractFirstMatch(
      text,
      /Tarjeta(?:\s+terminada)?(?:\s+n[o������]?\.?|\s+No\.?|\s+#)?\s*(\d{4})/i,
    ) ||
    extractFirstMatch(
      text,
      /Numero\s+de\s+Tarjeta[^\d]*?(\d{4})/i,
    );
  if (cardLast4) {
    confidenceCounter.value += 1;
  } else {
    notes.push('card_last4_not_found');
  }

  let merchant =
    extractFirstMatch(text, /Comercio:?\s*([^\n]+)/i) ||
    extractFirstMatch(text, /Establecimiento:?\s*([^\n]+)/i) ||
    extractFirstMatch(text, /Empresa:?\s*([^\n]+)/i);
  if (merchant) {
    merchant = merchant.replace(/\s+Numero\s+de\s+operaci(?:on|n).*$/i, '').trim();
    confidenceCounter.value += 1;
  } else {
    notes.push('merchant_not_found');
  }

  const location = extractFirstMatch(text, /Lugar(?:\s+de\s+consumo)?:?\s*([^\n]+)/i);
  const channel = extractFirstMatch(text, /Canal:?\s*([^\n]+)/i);

  const confidence = Math.max(0, Math.min(1, confidenceCounter.value / signalsTarget));

  const sanitizedMerchant = sanitize(merchant);
  const sanitizedLocation = sanitize(location);
  const sanitizedChannel = sanitize(channel);
  const primaryOperationId =
    extractFirstMatch(text, /Numero\s+de\s+operaci[o������]n:?\s*([A-Z0-9-]+)/i) ||
    extractFirstMatch(text, /Operaci[o������]n:?\s*([A-Z0-9-]+)/i);
  const sanitizedOperationId = sanitize(primaryOperationId);
  const maskedCard = cardLast4 ? `****${cardLast4}` : undefined;
  const cardPaymentDetails = compactObject({
    amount: amount || undefined,
    date: occurredAt || undefined,
    cardNumber: maskedCard,
    merchant: sanitizedMerchant,
    operationId: sanitizedOperationId,
  });

  const transaction = {
    source: 'BCP',
    template: 'card_purchase',
    occurredAt: occurredAt || null,
    amount: amount || null,
    exchangeRate: {
      used: false,
    },
    balanceAfter: undefined,
    channel: sanitizedChannel || undefined,
    merchant: sanitizedMerchant || undefined,
    location: sanitizedLocation || undefined,
    cardLast4: cardLast4 || undefined,
    accountRef: undefined,
    operationId: sanitizedOperationId || undefined,
    notes: notes.length > 0 ? notes.join('; ') : undefined,
    details: Object.keys(cardPaymentDetails).length > 0
      ? { cardPayment: cardPaymentDetails }
      : undefined,
    confidence,
  };

  return transaction;
}

module.exports = {
  parseCardPurchase,
};
