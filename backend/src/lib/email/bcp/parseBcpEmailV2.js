const logger = require('../../../config/logger');
const { NormalizedTransactionSchema } = require('../../../domain/NormalizedTransaction');
const { normalizeEmailBody } = require('../normalize');
const { detectTemplate } = require('./detectTemplate');
const { parseCardPurchase } = require('./parsers/cardPurchase');
const { parseOnlinePurchase } = require('./parsers/onlinePurchase');
const { parseAtmWithdrawal } = require('./parsers/atmWithdrawal');
const { parseAccountTransfer } = require('./parsers/accountTransfer');
const { parseIncomingCredit } = require('./parsers/incomingCredit');
const { parseServicePayment } = require('./parsers/servicePayment');
const { parseFeeCommission } = require('./parsers/feeCommission');
const { fallbackParseBcpEmail } = require('./fallbackParser');

const parsers = {
  card_purchase: parseCardPurchase,
  online_purchase: parseOnlinePurchase,
  atm_withdrawal: parseAtmWithdrawal,
  account_transfer: parseAccountTransfer,
  incoming_credit: parseIncomingCredit,
  service_payment: parseServicePayment,
  fee_commission: parseFeeCommission,
};

function parseBcpEmailV2({ subject, html, text, receivedAt } = {}) {
  const normalized = normalizeEmailBody(html || text || '');
  const detection = detectTemplate(subject, normalized);

  if (!detection) {
    const fallback = fallbackParseBcpEmail({ subject, html, text, receivedAt });
    if (fallback) {
      return fallback;
    }

    return {
      version: 'v2',
      success: false,
      confidence: 0,
      notes: ['template_not_detected'],
    };
  }

  const parser = parsers[detection.template];

  if (!parser) {
    logger.warn('BCP parser V2 template without implementation', {
      template: detection.template,
    });

    const fallback = fallbackParseBcpEmail({ subject, html, text, receivedAt });
    if (fallback) {
      return fallback;
    }

    return {
      version: 'v2',
      success: false,
      template: detection.template,
      confidence: 0,
      notes: ['parser_not_implemented'],
    };
  }

  let parsed;
  try {
    parsed = parser(normalized, { receivedAt });
  } catch (error) {
    logger.warn('BCP parser V2 failed to parse email', {
      template: detection.template,
      error: error.message,
    });

    const fallback = fallbackParseBcpEmail({ subject, html, text, receivedAt });
    if (fallback) {
      return fallback;
    }

    return {
      version: 'v2',
      success: false,
      template: detection.template,
      confidence: 0,
      notes: [`parser_error:${error.message}`],
    };
  }

  const validation = NormalizedTransactionSchema.safeParse(parsed);
  if (!validation.success) {
    const issues = validation.error && validation.error.issues
      ? validation.error.issues.map((issue) => issue.message)
      : [validation.error ? validation.error.message : 'validation_failed'];

    logger.warn('BCP parser V2 validation failed', {
      template: detection.template,
      issues,
    });

    const fallback = fallbackParseBcpEmail({ subject, html, text, receivedAt });
    if (fallback) {
      return fallback;
    }

    return {
      version: 'v2',
      success: false,
      template: detection.template,
      confidence: 0,
      notes: issues,
    };
  }

  const transaction = validation.data;

  const fallbackEnhancement = fallbackParseBcpEmail({ subject, html, text, receivedAt });
  if (fallbackEnhancement && fallbackEnhancement.success && fallbackEnhancement.transaction) {
    const fallbackTx = fallbackEnhancement.transaction;
    if (fallbackTx.template === transaction.template) {
      if (fallbackTx.confidence > transaction.confidence) {
        return fallbackEnhancement;
      }

      const mergeField = (key, predicate) => {
        if (typeof predicate !== 'function') {
          predicate = (value) => !value || (typeof value === 'string' && value.trim().length === 0);
        }

        const currentValue = transaction[key];
        const fallbackValue = fallbackTx[key];

        if (!fallbackValue) {
          return;
        }

        if (predicate(currentValue)) {
          transaction[key] = fallbackValue;
          return;
        }

        if (typeof currentValue === 'string' && typeof fallbackValue === 'string') {
          const normalizedCurrent = currentValue.trim();
          const normalizedFallback = fallbackValue.trim();
          const fallbackShorter = normalizedFallback.length > 0
            && normalizedCurrent.length > normalizedFallback.length * 1.5
            && normalizedCurrent.length - normalizedFallback.length >= 10;

          if (fallbackShorter) {
            transaction[key] = fallbackValue;
          }
        }
      };

      const isWeakString = (value) => typeof value === 'string' && value.trim().length < 3;

      mergeField('merchant', isWeakString);
      mergeField('accountRef', isWeakString);
      mergeField('cardLast4', isWeakString);
      mergeField('channel', isWeakString);
      mergeField('operationId', isWeakString);

      if (fallbackTx.notes) {
        if (!transaction.notes) {
          transaction.notes = fallbackTx.notes;
        } else if (!transaction.notes.includes(fallbackTx.notes)) {
          transaction.notes = `${transaction.notes} | ${fallbackTx.notes}`;
        }
      }

      transaction.confidence = Math.max(transaction.confidence, fallbackTx.confidence);
    }
  }

  return {
    version: 'v2',
    success: true,
    template: detection.template,
    transaction,
    confidence: transaction.confidence,
  };
}

module.exports = {
  parseBcpEmailV2,
};

