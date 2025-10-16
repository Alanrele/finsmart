function buildTransactionKeyFromNormalized(normalizedTx) {
  if (!normalizedTx) {
    return null;
  }

  const occurredAt = normalizedTx.occurredAt;
  const amountValue = normalizedTx.amount?.value;
  const currency = normalizedTx.amount?.currency || 'PEN';
  const operationId = normalizedTx.operationId || '';

  if (!occurredAt || !amountValue) {
    return null;
  }

  return `${occurredAt}|${currency}|${amountValue}|${operationId}`;
}

function buildTransactionKeyFromDocument(transaction) {
  if (!transaction) {
    return null;
  }

  const occurredAt = transaction.date
    ? new Date(transaction.date).toISOString()
    : '';
  const amount = Number.isFinite(transaction.amount)
    ? transaction.amount.toFixed(2)
    : String(transaction.amount || '');
  const currency = transaction.currency || 'PEN';
  const operationId = transaction.operationNumber || '';
  const messageId = transaction.messageId || '';

  if (!occurredAt || !amount) {
    return null;
  }

  return `${occurredAt}|${currency}|${amount}|${operationId}|${messageId}`;
}

function dedupeAndSortTransactions(transactions = []) {
  const seen = new Set();
  const unique = [];

  for (const transaction of transactions) {
    const key = buildTransactionKeyFromDocument(transaction);
    const fallbackKey = transaction?._id?.toString?.() || null;
    const dedupeKey = key || fallbackKey;

    if (dedupeKey) {
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
    }

    unique.push(transaction);
  }

  unique.sort((a, b) => {
    const aTime = a?.date ? new Date(a.date).getTime() : 0;
    const bTime = b?.date ? new Date(b.date).getTime() : 0;
    return bTime - aTime;
  });

  return unique;
}

module.exports = {
  buildTransactionKeyFromNormalized,
  buildTransactionKeyFromDocument,
  dedupeAndSortTransactions,
};
