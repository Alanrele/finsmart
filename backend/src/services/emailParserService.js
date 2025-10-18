const { extractAmountAndCurrency } = require('../lib/email/bcp/fallbackParser');
const { isTransactionalEmail } = require('./emailParser/detection');
const { parseEmailContent } = require('./emailParser/parser');
const { isValidParsedTransaction } = require('./emailParser/validation');
const { createTransactionFromEmail } = require('./emailParser/mapper');

module.exports = {
  isTransactionalEmail,
  parseEmailContent,
  isValidParsedTransaction,
  createTransactionFromEmail,
  extractAmountAndCurrency,
};
