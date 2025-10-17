const {
  extractFirstMatch,
  parseAmount,
  parseDate,
  parseSpanishDateTime,
  computeConfidence,
  sanitize,
} = require('./utils');

function parseServicePayment(text, options = {}) {
  const notes = [];
  let confidenceSignals = 0;
  const confidenceTarget = 6;

  let usedFallbackDate = false;

  const amount = parseAmount(text, [
    /Monto\s+(?:del\s+)?pago:?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
    /Monto\s+pagado:?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
    /Monto\s+total\s+pagado:?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
    /Monto\s+total:?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
    /Importe\s+pagado:?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
  ]);
  if (!amount) {
    throw new Error('amount_not_found');
  }
  confidenceSignals += 1;

  let occurredAt = parseDate(text, [
    /Fecha\s+y\s+hora:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})(?:\s+(\d{1,2}:\d{2}(?:\s*(?:a\.m\.|p\.m\.|AM|PM))?))?/i,
  ]);
  if (!occurredAt) {
    const textualLine = extractFirstMatch(text, /Fecha\s+y\s+hora:?\s*([^\n]+)/i);
    if (textualLine) {
      const parsedTextual = parseSpanishDateTime(textualLine);
      if (parsedTextual) {
        occurredAt = parsedTextual;
        confidenceSignals += 1;
      }
    }
  } else {
    confidenceSignals += 1;
  }

  if (!occurredAt) {
    if (options.receivedAt) {
      occurredAt = options.receivedAt;
      notes.push('datetime_fallback_received_at');
      usedFallbackDate = true;
    } else {
      throw new Error('datetime_not_found');
    }
  }

  const serviceName = extractFirstMatch(text, [
    /Servicio:?\s*([^\n]+)/i,
    /Empresa\s+servicio:?\s*([^\n]+)/i,
    /Empresa:?\s*([^\n]+)/i,
  ]);
  if (serviceName) {
    confidenceSignals += 1;
  } else {
    notes.push('service_not_found');
  }

  const customerCodePatterns = [
    { regex: /Codigo\s+de\s+cliente:?\s*([^\n]+)/i, reliability: 'strict' },
    { regex: /Cdigo\s+de\s+cliente:?\s*([^\n]+)/i, reliability: 'strict' },
    { regex: /Codigo\s+de\s+usuario:?\s*([^\n]+)/i, reliability: 'strict' },
    { regex: /Contrato:?\s*([^\n]+)/i, reliability: 'lenient' },
    { regex: /Suministro:?\s*([^\n]+)/i, reliability: 'lenient' },
  ];

  let customerCode;
  let customerCodeReliability = 'strict';

  for (const pattern of customerCodePatterns) {
    const match = text.match(pattern.regex);
    if (match) {
      customerCode = match[1];
      customerCodeReliability = pattern.reliability;
      break;
    }
  }

  if (customerCode && !usedFallbackDate) {
    const trimmedCode = String(customerCode).trim();
    const hasLetters = /[A-Za-z]/.test(trimmedCode);
    const digitCount = trimmedCode.replace(/\D/g, '').length;
    const isReliableCode = customerCodeReliability === 'lenient'
      ? trimmedCode.length > 0
      : hasLetters || digitCount >= 6;

    if (isReliableCode) {
      customerCode = trimmedCode;
      confidenceSignals += 1;
    } else {
      customerCode = undefined;
    }
  } else {
    customerCode = undefined;
  }

  if (!customerCode) {
    notes.push('customer_code_not_found');
  }

  const accountOrigin = extractFirstMatch(text, [
    /Cuenta\s+de?\s+origen:?\s*([^\n]+)/i,
    /Cuenta\s+origen:?\s*([^\n]+)/i,
  ]);
  if (accountOrigin) {
    confidenceSignals += 1;
  } else {
    notes.push('account_origin_not_found');
  }

  const channelRaw = extractFirstMatch(text, [
    /Canal:?\s*([^\n]+)/i,
    /Canal\s+([^\n]+)/i,
  ]);
  if (channelRaw) {
    confidenceSignals += 1;
  }
  const channel = channelRaw || 'online';

  const operationId =
    extractFirstMatch(text, /Operaci(?:on|n):?\s*([A-Z0-9-]+)/i) ||
    extractFirstMatch(text, /Numero\s+de\s+Operaci(?:on|n):?\s*([A-Z0-9-]+)/i);
  if (operationId) {
    confidenceSignals += 1;
  } else {
    notes.push('operation_id_not_found');
  }

  const confidence = computeConfidence(confidenceSignals, confidenceTarget);

  const accountRefParts = [];
  if (customerCode) {
    accountRefParts.push(`codigo:${customerCode}`);
  }
  if (accountOrigin) {
    accountRefParts.push(`origen:${accountOrigin}`);
  }

  return {
    source: 'BCP',
    template: 'service_payment',
    occurredAt,
    amount,
    exchangeRate: {
      used: false,
    },
    balanceAfter: undefined,
    channel: sanitize(channel),
    merchant: sanitize(serviceName),
    location: undefined,
    cardLast4: undefined,
    accountRef: accountRefParts.length > 0 ? accountRefParts.join(' | ') : undefined,
    operationId: sanitize(operationId),
    notes: notes.length > 0 ? notes.join('; ') : undefined,
    confidence,
  };
}

module.exports = {
  parseServicePayment,
};

