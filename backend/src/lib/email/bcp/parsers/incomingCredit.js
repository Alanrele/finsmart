const {
  extractFirstMatch,
  parseAmount,
  parseDate,
  computeConfidence,
  sanitize,
} = require('./utils');

function parseIncomingCredit(text, options = {}) {
  const notes = [];
  let confidenceSignals = 0;
  const confidenceTarget = 4;

  const amount = parseAmount(text, [
    /Monto\s+(?:abonado|depositado|devuelto):?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
    /Importe\s+(?:abonado|devuelto):?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
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

  const destinationAccount = extractFirstMatch(text, [
    /Cuenta\s+(?:destino|abono):?\s*([^\n]+)/i,
    /Cuenta:?\s*([^\n]+)/i,
  ]);
  if (destinationAccount) {
    confidenceSignals += 1;
  } else {
    notes.push('account_destination_not_found');
  }

  const origin = extractFirstMatch(text, [
    /Origen:?\s*([^\n]+)/i,
    /Procedencia:?\s*([^\n]+)/i,
  ]);
  if (origin) {
    confidenceSignals += 1;
  }

  const motive = extractFirstMatch(text, [
    /Motivo:?\s*([^\n]+)/i,
    /Concepto:?\s*([^\n]+)/i,
  ]);
  if (motive) {
    notes.push(`motivo:${motive}`);
    confidenceSignals += 1;
  } else {
    notes.push('motive_not_found');
  }

  const operationId = extractFirstMatch(text, [
    /Operaci(?:on|n):?\s*([A-Z0-9\-]+)/i,
    /N(?:umero|mero)\s+de\s+operaci(?:on|n):?\s*([A-Z0-9\-]+)/i,
  ]);
  if (operationId) {
    confidenceSignals += 1;
  } else {
    notes.push('operation_id_not_found');
  }

  const confidence = computeConfidence(confidenceSignals, confidenceTarget);

  const accountRefParts = [];
  if (destinationAccount) {
    accountRefParts.push(`destino:${destinationAccount}`);
  }
  if (origin) {
    accountRefParts.push(`origen:${origin}`);
  }

  return {
    source: 'BCP',
    template: 'incoming_credit',
    occurredAt,
    amount,
    exchangeRate: {
      used: false,
    },
    balanceAfter: undefined,
    channel: 'incoming',
    merchant: sanitize(origin),
    location: undefined,
    cardLast4: undefined,
    accountRef: accountRefParts.length > 0 ? accountRefParts.join(' | ') : undefined,
    operationId: sanitize(operationId),
    notes: notes.length > 0 ? notes.join('; ') : undefined,
    confidence,
  };
}

module.exports = {
  parseIncomingCredit,
};
