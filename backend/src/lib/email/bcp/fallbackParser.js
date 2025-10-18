const { extractFromHtml } = require('./fallback/htmlExtractor');
const { extractFromText } = require('./fallback/textExtractor');
const { mergeFieldSets } = require('./fallback/fieldMerger');
const { buildNormalizedTransaction } = require('./fallback/transactionBuilder');
const {
  extractAmountAndCurrency,
  parseSpanishDate,
} = require('./fallback/shared');

function fallbackParseBcpEmail({ subject, html, text, receivedAt }) {
  const htmlFields = extractFromHtml(html);
  const textFields = extractFromText({ subject, html, text });
  const mergedFields = mergeFieldSets(htmlFields, textFields);

  const transaction = buildNormalizedTransaction(mergedFields, {
    subject,
    receivedAt,
  });

  if (!transaction) {
    return null;
  }

  return {
    version: 'v2',
    success: true,
    template: transaction.template,
    transaction,
    confidence: transaction.confidence,
    notes: ['cheerio_fallback_parser'],
  };
}

module.exports = {
  fallbackParseBcpEmail,
  extractAmountAndCurrency,
  parseSpanishDate,
};
