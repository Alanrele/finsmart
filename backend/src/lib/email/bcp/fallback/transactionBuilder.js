const { toIsoDateTime } = require('./shared');

const TEMPLATE_INFERENCE_HINTS = {
  account_transfer: [/transferencia|envio|cci/i],
  service_payment: [/servicio|pago de servicio|recibo|factura/i],
  card_purchase: [/compra|consumo/i],
  atm_withdrawal: [/retiro|cajero/i],
  incoming_credit: [/abono|deposito|ingreso|devolucion|devuelto|reembolso/i],
  fee_commission: [/comision|cargo por servicio/i],
};

function inferTemplate(fields) {
  const haystack = [
    fields.operationType,
    fields.sendingType,
    fields.paymentType,
    fields.merchant,
    fields.channel,
    fields.serviceName,
    fields.serviceHolder,
    fields.serviceCode,
    fields.normalizedText,
    fields.subject,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const [template, expressions] of Object.entries(TEMPLATE_INFERENCE_HINTS)) {
    if (expressions.some((pattern) => pattern.test(haystack))) {
      return template;
    }
  }

  return 'account_transfer';
}

function buildNotes(fields) {
  const notes = [];

  if (fields.beneficiary) {
    notes.push(`Beneficiario: ${fields.beneficiary}`);
  }
  if (fields.bankDest) {
    notes.push(`Banco destino: ${fields.bankDest}`);
  }
  if (fields.serviceName) {
    notes.push(`Servicio: ${fields.serviceName}`);
  }
  if (fields.serviceHolder) {
    notes.push(`Titular: ${fields.serviceHolder}`);
  }
  if (fields.serviceCode) {
    notes.push(`Codigo: ${fields.serviceCode}`);
  }
  if (fields.beneficiaryAccount) {
    notes.push(`Cuenta destino: ****${fields.beneficiaryAccount}`);
  }

  return notes;
}

function resolveMerchant(fields, template) {
  if (fields.merchant) {
    return fields.merchant;
  }

  if (template === 'account_transfer') {
    return fields.beneficiary || undefined;
  }

  if (template === 'service_payment') {
    return fields.serviceName || fields.beneficiary || undefined;
  }

  return undefined;
}

function buildNormalizedTransaction(fields, context) {
  const { receivedAt } = context;
  const { amountInfo } = fields;

  if (!amountInfo) {
    return null;
  }

  const occurredAt = toIsoDateTime(fields.date, receivedAt);
  const template = inferTemplate(fields);
  const notes = buildNotes(fields);

  let confidence = 0.6;
  if (fields.date) {
    confidence += 0.1;
  }
  if (fields.operationNumber) {
    confidence += 0.1;
  }
  if (fields.operationType || fields.merchant || fields.beneficiary) {
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
    merchant: resolveMerchant(fields, template),
    location: undefined,
    cardLast4: fields.cardLast4,
    accountRef: fields.originAccount,
    operationId: fields.operationNumber,
    notes: notes.length > 0 ? notes.join(' | ') : undefined,
    confidence,
  };
}

module.exports = {
  buildNormalizedTransaction,
};
