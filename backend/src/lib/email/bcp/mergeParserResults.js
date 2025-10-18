function isEmpty(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim().length === 0);
}

function shouldReplace(current, fallback) {
  if (isEmpty(current) && !isEmpty(fallback)) {
    return true;
  }
  if (typeof current === 'string' && typeof fallback === 'string') {
    const normalizedCurrent = current.trim();
    const normalizedFallback = fallback.trim();
    if (normalizedFallback && normalizedCurrent.length > normalizedFallback.length * 1.5) {
      return true;
    }
  }
  return false;
}

function mergeNotes(primaryNotes, fallbackNotes) {
  if (!primaryNotes) {
    return fallbackNotes || undefined;
  }
  if (!fallbackNotes) {
    return primaryNotes;
  }
  const combined = new Set([
    ...[].concat(primaryNotes),
    ...[].concat(fallbackNotes),
  ]);
  return Array.from(combined).join(' | ');
}

function mergeDetails(primaryDetails, fallbackDetails) {
  if (!fallbackDetails) {
    return primaryDetails;
  }
  if (!primaryDetails) {
    return fallbackDetails;
  }

  const merged = { ...primaryDetails };

  for (const [key, value] of Object.entries(fallbackDetails)) {
    if (!value) {
      continue;
    }

    const current = primaryDetails[key];
    if (!current) {
      merged[key] = value;
      continue;
    }

    if (typeof current === 'object' && typeof value === 'object') {
      merged[key] = { ...value, ...current };
      continue;
    }

    merged[key] = current;
  }

  return merged;
}

function mergeTransactions(primaryResult, fallbackResult) {
  if (!primaryResult || !primaryResult.transaction) {
    return fallbackResult || primaryResult;
  }

  if (!fallbackResult || !fallbackResult.success || !fallbackResult.transaction) {
    return primaryResult;
  }

  const primaryTx = primaryResult.transaction;
  const fallbackTx = fallbackResult.transaction;

  if (fallbackTx.template !== primaryTx.template) {
    return primaryResult;
  }

  if (fallbackTx.confidence > primaryTx.confidence) {
    const winningTx = { ...fallbackTx };
    const mergedDetails = mergeDetails(primaryTx.details, fallbackTx.details);
    if (mergedDetails) {
      winningTx.details = mergedDetails;
    }

    return {
      ...primaryResult,
      transaction: winningTx,
      confidence: fallbackTx.confidence,
      notes: mergeNotes(primaryResult.notes, fallbackResult.notes),
    };
  }

  const mergedTx = { ...primaryTx };
  const fieldsToConsider = [
    'merchant',
    'accountRef',
    'cardLast4',
    'channel',
    'operationId',
    'bankDest',
    'beneficiary',
    'serviceName',
    'serviceHolder',
    'serviceCode',
    'beneficiaryAccount',
    'location',
  ];

  for (const key of fieldsToConsider) {
    if (shouldReplace(primaryTx[key], fallbackTx[key])) {
      mergedTx[key] = fallbackTx[key];
    }
  }

  mergedTx.details = mergeDetails(primaryTx.details, fallbackTx.details);
  mergedTx.notes = mergeNotes(primaryTx.notes, fallbackTx.notes);
  mergedTx.confidence = Math.max(primaryTx.confidence, fallbackTx.confidence);

  return {
    ...primaryResult,
    transaction: mergedTx,
    confidence: mergedTx.confidence,
    notes: mergeNotes(primaryResult.notes, fallbackResult.notes),
  };
}

module.exports = {
  mergeTransactions,
};
