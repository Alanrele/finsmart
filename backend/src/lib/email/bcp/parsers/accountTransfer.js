const {
  extractFirstMatch,
  parseAmount,
  parseDate,
  parseSpanishDateTime,
  computeConfidence,
  sanitize,
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

  return {
    source: 'BCP',
    template: 'account_transfer',
    occurredAt,
    amount,
    exchangeRate: { used: false },
    balanceAfter: undefined,
    channel: sanitize(channel),
    merchant: sanitize(destinationName),
    location: undefined,
    cardLast4: undefined,
    accountRef: buildAccountRef(sanitize(accountOrigin), sanitize(accountDestination), sanitize(cci)),
    operationId: sanitize(operationId),
    notes: notes.length > 0 ? notes.join('; ') : undefined,
    confidence,
  };
}

module.exports = {
  parseAccountTransfer,
};
