const {
  extractFirstMatch,
  parseAmount,
  parseDate,
  computeConfidence,
  sanitize,
  compactObject,
} = require('./utils');

const CARD_PATTERNS = [
  /Tarjeta(?:\s+terminada)?(?:\s+n(?:um\.?|o\.?)|\s+No\.?|\s+#|\s+numero)?\s*(\d{4})/i,
  /Tarjeta\s+terminada\s+en\s*(\d{4})/i,
];

function extractCardLast4(text) {
  for (const pattern of CARD_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

function parseOnlinePurchase(text, options = {}) {
  const notes = [];
  let confidenceSignals = 0;
  const confidenceTarget = 5;

  const amount = parseAmount(text, [
    /Monto\s+(?:de\s+)?compra:?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
    /Importe:?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
  ]);
  if (!amount) {
    throw new Error('amount_not_found');
  }
  confidenceSignals += 1;

  let occurredAt = parseDate(text, [
    /Fecha\s+y\s+hora:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})(?:\s+(\d{1,2}:\d{2}(?:\s*(?:a\.m\.|p\.m\.|AM|PM))?))?/i,
  ]);
  if (!occurredAt) {
    if (options.receivedAt) {
      occurredAt = options.receivedAt;
      notes.push('datetime_fallback_received_at');
    } else {
      throw new Error('datetime_not_found');
    }
  } else {
    confidenceSignals += 1;
  }

  const cardLast4 = extractCardLast4(text);
  if (cardLast4) {
    confidenceSignals += 1;
  } else {
    notes.push('card_last4_not_found');
  }

  const merchant = extractFirstMatch(text, /Comercio:?\s*([^\n]+)/i)
    || extractFirstMatch(text, /Establecimiento:?\s*([^\n]+)/i);
  if (merchant) {
    confidenceSignals += 1;
  } else {
    notes.push('merchant_not_found');
  }

  const channelRaw = extractFirstMatch(text, /Canal:?\s*([^\n]+)/i);
  if (channelRaw) {
    confidenceSignals += 1;
  } else {
    notes.push('channel_not_found');
  }
  const channel = channelRaw || 'online';

  const location = extractFirstMatch(text, /Lugar(?:\s+de\s+compra)?:?\s*([^\n]+)/i);

  const operationId =
    extractFirstMatch(text, /Operaci(?:on|n):?\s*([A-Z0-9-]+)/i) ||
    extractFirstMatch(text, /Numero\s+de\s+operaci(?:on|n):?\s*([A-Z0-9-]+)/i);

  const confidence = computeConfidence(confidenceSignals, confidenceTarget);

  const sanitizedChannel = sanitize(channel);
  const sanitizedMerchant = sanitize(merchant);
  const sanitizedLocation = sanitize(location);
  const sanitizedCardLast4 = sanitize(cardLast4);
  const sanitizedOperationId = sanitize(operationId);
  const maskedCard = sanitizedCardLast4 ? `****${sanitizedCardLast4}` : undefined;
  const cardPaymentDetails = compactObject({
    amount: amount || undefined,
    date: occurredAt || undefined,
    cardNumber: maskedCard,
    merchant: sanitizedMerchant,
    operationId: sanitizedOperationId,
  });

  return {
    source: 'BCP',
    template: 'online_purchase',
    occurredAt,
    amount,
    exchangeRate: { used: false },
    balanceAfter: undefined,
    channel: sanitizedChannel,
    merchant: sanitizedMerchant,
    location: sanitizedLocation,
    cardLast4: sanitizedCardLast4,
    accountRef: undefined,
    operationId: sanitizedOperationId,
    notes: notes.length > 0 ? notes.join('; ') : undefined,
    details: Object.keys(cardPaymentDetails).length > 0
      ? { cardPayment: cardPaymentDetails }
      : undefined,
    confidence,
  };
}

module.exports = {
  parseOnlinePurchase,
};
