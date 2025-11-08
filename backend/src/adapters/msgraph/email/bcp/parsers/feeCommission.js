const {
  extractFirstMatch,
  parseAmount,
  parseDate,
  computeConfidence,
  sanitize,
} = require('./utils');

function parseFeeCommission(text, options = {}) {
  const notes = [];
  let confidenceSignals = 0;
  const confidenceTarget = 5;

  const amount = parseAmount(text, [
    /Monto\s+(?:de\s+)?comisi(?:on|n):?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
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

  const accountAffected = extractFirstMatch(text, /Cuenta\s+afectada:?\s*([^\n]+)/i);
  if (accountAffected) {
    confidenceSignals += 1;
  } else {
    notes.push('account_affected_not_found');
  }

  const motive = extractFirstMatch(text, /Motivo(?:\s+del\s+cargo)?:?\s*([^\n]+)/i);
  if (motive) {
    notes.push(`motivo:${motive}`);
    confidenceSignals += 1;
  } else {
    notes.push('motive_not_found');
  }

  const channelRaw = extractFirstMatch(text, /Canal:?\s*([^\n]+)/i);
  if (channelRaw) {
    confidenceSignals += 1;
  }
  const channel = channelRaw || 'other';

  const operationId =
    extractFirstMatch(text, /Operaci(?:on|n):?\s*([A-Z0-9-]+)/i) ||
    extractFirstMatch(text, /Numero\s+de\s+operaci(?:on|n):?\s*([A-Z0-9-]+)/i);
  if (!operationId) {
    notes.push('operation_id_not_found');
  } else {
    confidenceSignals += 1;
  }

  const confidence = computeConfidence(confidenceSignals, confidenceTarget);

  const accountRefParts = [];
  if (accountAffected) {
    accountRefParts.push(`afectada:${accountAffected}`);
  }

  return {
    source: 'BCP',
    template: 'fee_commission',
    occurredAt,
    amount,
    exchangeRate: { used: false },
    balanceAfter: undefined,
    channel: sanitize(channel),
    merchant: sanitize(motive),
    location: undefined,
    cardLast4: undefined,
    accountRef: accountRefParts.length > 0 ? accountRefParts.join(' | ') : undefined,
    operationId: sanitize(operationId),
    notes: notes.length > 0 ? notes.join('; ') : undefined,
    confidence,
  };
}

module.exports = {
  parseFeeCommission,
};
