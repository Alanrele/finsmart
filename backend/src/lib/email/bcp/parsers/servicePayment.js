const {
  extractFirstMatch,
  parseAmount,
  parseDate,
  parseSpanishDateTime,
  computeConfidence,
  sanitize,
  compactObject,
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

  const companyName = extractFirstMatch(text, [
    /Empresa:?\s*([^\n]+)/i,
  ]);

  const serviceName = extractFirstMatch(text, [
    /\bServicio\b:?\s*([^\n]+)/i,
    /Empresa\s+servicio:?\s*([^\n]+)/i,
  ]) || companyName;
  if (serviceName) {
    confidenceSignals += 1;
  } else {
    notes.push('service_not_found');
  }

  const serviceHolder = extractFirstMatch(text, /Titular\s+del\s+servicio:?\s*([^\n]+)/i);
  const operationPerformed = extractFirstMatch(
    text,
    /Operaci(?:on|n)\s+realizada:?\s*([^\n]+)/i,
  );

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

  if (customerCode) {
    customerCode = String(customerCode)
      .replace(/\s+Cuenta\s+de.*$/i, '')
      .trim();
  }

  if (customerCode) {
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
  const originAccountMasked = extractFirstMatch(text, /\*{2,}\s*\d{3,4}/i);

  const channelRaw = extractFirstMatch(text, [
    /Canal:?\s*([^\n]+)/i,
    /Canal\s+([^\n]+)/i,
  ]);
  if (channelRaw) {
    confidenceSignals += 1;
  }
  const channel = channelRaw || 'online';

  const operationId =
    extractFirstMatch(text, /Numero\s+de\s+Operaci(?:on|n):?\s*([A-Z0-9-]+)/i) ||
    extractFirstMatch(text, /Operaci(?:on|n):?\s*([A-Z0-9-]+)/i);
  if (operationId) {
    confidenceSignals += 1;
  } else {
    notes.push('operation_id_not_found');
  }

  const confidence = computeConfidence(confidenceSignals, confidenceTarget);

  const sanitizedChannel = sanitize(channel);
  const sanitizedCompany = sanitize(companyName);
  const sanitizedService = sanitize(serviceName);
  const sanitizedServiceHolder = sanitize(serviceHolder);
  const sanitizedCustomerCode = sanitize(customerCode);
  const sanitizedAccountOrigin = sanitize(accountOrigin);
  const sanitizedOperationId = sanitize(operationId);
  const sanitizedOperationPerformed = sanitize(operationPerformed);
  const sanitizedOriginMasked = sanitize(originAccountMasked);

  const originAccountForDetails = sanitizedOriginMasked || sanitizedAccountOrigin;
  const merchantValue = sanitizedCompany || sanitizedService;

  const accountRefParts = [];
  if (sanitizedCustomerCode) {
    accountRefParts.push(`codigo:${sanitizedCustomerCode}`);
  }
  if (sanitizedAccountOrigin) {
    accountRefParts.push(`origen:${sanitizedAccountOrigin}`);
  }

  const serviceDetails = compactObject({
    company: sanitizedCompany,
    service: sanitizedService,
    serviceHolder: sanitizedServiceHolder,
    userCode: sanitizedCustomerCode,
    originAccount: originAccountForDetails,
    operation: sanitizedOperationPerformed,
  });

  return {
    source: 'BCP',
    template: 'service_payment',
    occurredAt,
    amount,
    exchangeRate: {
      used: false,
    },
    balanceAfter: undefined,
    channel: sanitizedChannel,
    merchant: merchantValue,
    location: undefined,
    cardLast4: undefined,
    accountRef: accountRefParts.length > 0 ? accountRefParts.join(' | ') : undefined,
    operationId: sanitizedOperationId,
    notes: notes.length > 0 ? notes.join('; ') : undefined,
    details: Object.keys(serviceDetails).length > 0
      ? { servicePayment: serviceDetails }
      : undefined,
    confidence,
  };
}

module.exports = {
  parseServicePayment,
};

