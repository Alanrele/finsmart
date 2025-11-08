const { MIN_CONFIDENCE } = require('./constants');

function isValidParsedTransaction(result) {
  if (!result || !result.success || !result.transaction) {
    return false;
  }

  const tx = result.transaction;
  const amount = parseFloat(tx.amount?.value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return false;
  }

  return tx.confidence >= MIN_CONFIDENCE;
}

module.exports = {
  isValidParsedTransaction,
};
