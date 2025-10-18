const { TEMPLATE_TYPE_MAP, TEMPLATE_CATEGORY_MAP } = require('./constants');

function mapChannel(value) {
  if (!value) {
    return 'other';
  }

  const normalized = String(value).toLowerCase();
  if (normalized.includes('atm') || normalized.includes('cajero')) {
    return 'atm';
  }
  if (normalized.includes('pos') || normalized.includes('terminal') || normalized.includes('comercio')) {
    return 'pos';
  }
  if (normalized.includes('móvil') || normalized.includes('movil') || normalized.includes('app')) {
    return 'mobile';
  }
  if (normalized.includes('web') || normalized.includes('online') || normalized.includes('internet')) {
    return 'online';
  }
  if (normalized.includes('agencia') || normalized.includes('sucursal') || normalized.includes('branch')) {
    return 'branch';
  }
  return 'other';
}

function buildDescription(transaction) {
  if (transaction.merchant) {
    return `Pago en ${transaction.merchant}`;
  }
  if (transaction.accountRef) {
    return `Operación ${transaction.accountRef}`;
  }
  if (transaction.notes) {
    return transaction.notes;
  }
  return `Transacción ${transaction.template.replace(/_/g, ' ')}`;
}

function createTransactionFromEmail(result, userId, emailMeta = {}) {
  if (!result || !result.transaction) {
    throw new Error('Normalized transaction result is required');
  }

  const tx = result.transaction;
  const amount = parseFloat(tx.amount.value);

  if (!Number.isFinite(amount)) {
    throw new Error(`Invalid transaction amount received: ${tx.amount.value}`);
  }

  const type = TEMPLATE_TYPE_MAP[tx.template] || 'debit';
  const category = TEMPLATE_CATEGORY_MAP[tx.template] || 'other';
  const description = buildDescription(tx);

  let balanceValue;
  if (tx.balanceAfter) {
    const parsedBalance = parseFloat(tx.balanceAfter);
    if (Number.isFinite(parsedBalance)) {
      balanceValue = parsedBalance;
    }
  }

  const occurredAt = tx.occurredAt
    ? new Date(tx.occurredAt)
    : (emailMeta.receivedDateTime ? new Date(emailMeta.receivedDateTime) : new Date());

  return {
    userId,
    amount,
    currency: tx.amount.currency,
    type,
    category,
    merchant: tx.merchant || undefined,
    description,
    channel: mapChannel(tx.channel),
    operationNumber: tx.operationId || undefined,
    accountRef: tx.accountRef || undefined,
    cardNumber: tx.cardLast4 ? `****${tx.cardLast4}` : undefined,
    date: occurredAt,
    balance: balanceValue,
    location: tx.location || undefined,
    aiAnalysis: {
      confidence: tx.confidence,
    },
  };
}

module.exports = {
  createTransactionFromEmail,
  mapChannel,
};
