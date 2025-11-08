const {
  extractFirstMatch,
  parseAmount,
  parseDate,
  parseSpanishDateTime,
  computeConfidence,
  sanitize,
  compactObject,
} = require('./utils');

const NUMBER_VARIANTS = '(?:Numero|Nmero)';
const OPERATION_VARIANTS = '(?:operacion|operacin)';

const OPERATION_ID_REGEX = new RegExp(`${NUMBER_VARIANTS}\\s+de\\s+${OPERATION_VARIANTS}:?\\s*([A-Z0-9-]+)`, 'i');
const OPERATION_ID_FALLBACK = new RegExp(`${OPERATION_VARIANTS}:?\\s*([A-Z0-9-]+)`, 'i');

function buildAccountRef(origin, destination, cci) {
  const parts = [];
  if (origin) parts.push(`origen:${origin}`);
  if (destination) parts.push(`destino:${destination}`);
  if (cci) parts.push(`cci:${cci}`);
  return parts.length > 0 ? parts.join(' | ') : undefined;
}

function parseAccountTransfer(text, options = {}) {
  const notes = [];
  let confidenceSignals = 0;
  const confidenceTarget = 6;

  const amount = parseAmount(text, [
    new RegExp(`Monto\\s+(?:transferido|de\\s+la\\s+${OPERATION_VARIANTS}|enviado):?\\s*((?:S\\/|US\\$|USD|\\$|PEN)?)[\\s]*([0-9][0-9.,]*)`, 'i'),
    /Monto\s+total:?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
    /Total\s+cobrado\s+al\s+tipo\s+de\s+cambio:?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
    /Importe:?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
  ]);
  if (!amount) {
    throw new Error('amount_not_found');
  }
  confidenceSignals += 1;

  const commission = parseAmount(text, [
    /Comisi(?:on|n):?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
    /Costo\s+de\s+env[ií]o:?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
  ]);

  const totalCharged = parseAmount(text, [
    /Total\s+cobrado:?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
    /Total\s+pagado:?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
    /Importe\s+total:?\s*((?:S\/|US\$|USD|\$|PEN)?)[\s]*([0-9][0-9.,]*)/i,
  ]);

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
    } else {
      throw new Error('datetime_not_found');
    }
  }

  const accountOrigin = extractFirstMatch(text, [
    /Cuenta\s+de?\s+origen:?\s*([^\n]+)/i,
    /Cuenta\s+origen:?\s*([^\n]+)/i,
    /Desde:?\s*([^\n]+)/i,
    /Desde\s+([^\n]+)/i,
  ]);
  if (accountOrigin) {
    confidenceSignals += 1;
  } else {
    notes.push('account_origin_not_found');
  }
  const originAccountMasked = extractFirstMatch(text, /\*{2,}\s*\d{3,4}/i);

  const accountDestination = extractFirstMatch(text, [
    /Cuenta\s+destino:?\s*([^\n]+)/i,
    /Destino:?\s*([^\n]+)/i,
    /Enviado\s+a:?\s*([^\n]+)/i,
  ]);
  if (accountDestination) {
    confidenceSignals += 1;
  } else {
    notes.push('account_destination_not_found');
  }

  const cci = extractFirstMatch(text, /CCI:?\s*([0-9\- ]{10,})/i);
  if (cci) {
    confidenceSignals += 1;
  }

  const channelRaw = extractFirstMatch(text, [
    /Canal:?\s*([^\n]+)/i,
    /Canal\s+([^\n]+)/i,
  ]);
  if (channelRaw) {
    confidenceSignals += 1;
  }
  const channel = channelRaw || 'online';

  const operationPerformed = extractFirstMatch(text, /Operaci(?:on|n)\s+realizada:?\s*([^\n]+)/i);
  const destinationBank = extractFirstMatch(text, /Banco\s+destino:?\s*([^\n]+)/i);
  const currencyLabel = extractFirstMatch(text, /Moneda:?\s*([^\n]+)/i);
  const sendingType = extractFirstMatch(text, /Tipo\s+de\s+env[ií]o:?\s*([^\n]+)/i);
  const originLabel = extractFirstMatch(text, /Origen:?\s*([^\n]+)/i);

  let operationId = extractFirstMatch(text, OPERATION_ID_REGEX);
  if (!operationId) {
    operationId = extractFirstMatch(text, OPERATION_ID_FALLBACK);
  }
  if (operationId) {
    confidenceSignals += 1;
  } else {
    notes.push('operation_id_not_found');
  }

  const destinationName = extractFirstMatch(text, [
    /Beneficiario:?\s*([^\n]+)/i,
    /Titular\s+destino:?\s*([^\n]+)/i,
    /Enviado\s+a:?\s*([^\n]+)/i,
  ]);

  const confidence = computeConfidence(confidenceSignals, confidenceTarget);

  const sanitizedChannel = sanitize(channel);
  const sanitizedDestinationName = sanitize(destinationName);
  const sanitizedAccountOrigin = sanitize(accountOrigin);
  const sanitizedAccountDestination = sanitize(accountDestination);
  const sanitizedCci = sanitize(cci);
  const sanitizedOperationId = sanitize(operationId);
  const sanitizedDestinationBank = sanitize(destinationBank);
  const sanitizedCurrencyLabel = sanitize(currencyLabel);
  const sanitizedSendingType = sanitize(sendingType);
  const sanitizedOriginLabel = sanitize(originLabel);
  const sanitizedOperationPerformed = sanitize(operationPerformed);
  const sanitizedOriginMasked = sanitize(originAccountMasked);

  const cleanedOriginLabel = sanitizedOriginLabel
    ? sanitizedOriginLabel
      .replace(/\s+Cuenta\s+de\s+origen.*$/i, '')
      .replace(/\s+Cuenta\s+destino.*$/i, '')
      .replace(/\s+Cuenta\s+de\s*$/i, '')
      .trim()
    : undefined;
  const originDetail = sanitizedOriginMasked || cleanedOriginLabel || sanitizedAccountOrigin;

  const transferDetails = compactObject({
    amountSent: amount || undefined,
    commission,
    totalCharged,
    operation: sanitizedOperationPerformed,
    date: occurredAt || undefined,
    recipient: sanitizedDestinationName,
    destinationBank: sanitizedDestinationBank,
    currency: sanitizedCurrencyLabel || (amount ? amount.currency : undefined),
    sendingType: sanitizedSendingType,
    origin: originDetail,
  });

  return {
    source: 'BCP',
    template: 'account_transfer',
    occurredAt,
    amount,
    exchangeRate: { used: false },
    balanceAfter: undefined,
    channel: sanitizedChannel,
    merchant: sanitizedDestinationName,
    location: undefined,
    cardLast4: undefined,
    accountRef: buildAccountRef(sanitizedAccountOrigin, sanitizedAccountDestination, sanitizedCci),
    operationId: sanitizedOperationId,
    notes: notes.length > 0 ? notes.join('; ') : undefined,
    details: Object.keys(transferDetails).length > 0
      ? { digitalTransfer: transferDetails }
      : undefined,
    confidence,
  };
}

module.exports = {
  parseAccountTransfer,
};
