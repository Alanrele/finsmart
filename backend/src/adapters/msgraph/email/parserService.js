const { extractAmountAndCurrency } = require('./bcp/fallbackParser');
const { isTransactionalEmail } = require('./parser/detection');
const { parseEmailContent } = require('./parser/parser');
const { isValidParsedTransaction } = require('./parser/validation');
const { createTransactionFromEmail } = require('./parser/mapper');

module.exports = {
  isTransactionalEmail,
  parseEmailContent,
  isValidParsedTransaction,
  createTransactionFromEmail,
  extractAmountAndCurrency,
};
