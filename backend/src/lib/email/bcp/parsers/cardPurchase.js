const { parseMoneyToCanonical, parseDateTimeLima } = require('../../normalize');

function extractFirstMatch(text, regex) {
  const match = text.match(regex);
  if (!match) {
    return null;
  }
  return match[1] ? match[1].trim() : match[0].trim();
}

function parseCardPurchase(text, options = {}) {
  const notes = [];
  let confidenceSignals = 0;
  const signalsTarget = 4;

  const amountMatch = text.match(/Monto(?:\s+de)?\s+consumo:?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i)
    || text.match(/Importe:?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i);

  let amount;
  if (amountMatch) {
    try {
      amount = parseMoneyToCanonical(amountMatch[1], amountMatch[2]);
      confidenceSignals += 1;
    } catch (error) {
      notes.push(`amount_parse_error: ${error.message}`);
    }
  } else {
    notes.push('amount_not_found');
  }

  const dateTimeMatch = text.match(/Fecha\s+y\s+hora:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})(?:\s+(\d{1,2}:\d{2}(?:\s*(?:a\.m\.|p\.m\.|AM|PM))?))?/i)
    || text.match(/Fecha:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})(?:\s+(\d{1,2}:\d{2}(?:\s*(?:a\.m\.|p\.m\.|AM|PM))?))?/i);

  let occurredAt;
  if (dateTimeMatch) {
    try {
      occurredAt = parseDateTimeLima(dateTimeMatch[1], dateTimeMatch[2]);
      confidenceSignals += 1;
    } catch (error) {
      notes.push(`datetime_parse_error: ${error.message}`);
    }
  } else if (options.receivedAt) {
    occurredAt = options.receivedAt;
    notes.push('datetime_fallback_received_at');
  } else {
    notes.push('datetime_not_found');
  }

  const cardLast4 = extractFirstMatch(
    text,
    /Tarjeta(?:\s+terminada)?(?:\s+n[o°]?\.?|\s+No\.?|\s+#)?\s*(\d{4})/i,
  );
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

  const location = extractFirstMatch(text, /Lugar(?:\s+de\s+consumo)?:?\s*([^\n]+)/i);

  const channel = extractFirstMatch(text, /Canal:?\s*([^\n]+)/i);

  const confidence = Math.max(0, Math.min(1, confidenceSignals / signalsTarget));

  const transaction = {
    source: 'BCP',
    template: 'card_purchase',
    occurredAt: occurredAt || null,
    amount: amount || null,
    exchangeRate: {
      used: false,
    },
    balanceAfter: undefined,
    channel: channel || undefined,
    merchant: merchant || undefined,
    location: location || undefined,
    cardLast4: cardLast4 || undefined,
    accountRef: undefined,
    operationId: extractFirstMatch(text, /Operaci[oó]n:?\s*(\w+)/i) || undefined,
    notes: notes.length > 0 ? notes.join('; ') : undefined,
    confidence,
  };

  return transaction;
}

module.exports = {
  parseCardPurchase,
};

