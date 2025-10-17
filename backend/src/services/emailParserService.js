const logger = require('../config/logger');
const { normalizeEmailBody } = require('../lib/email/normalize');
const { detectTemplate } = require('../lib/email/bcp/detectTemplate');
const { parseBcpEmailV2 } = require('../lib/email/bcp/parseBcpEmailV2');
const { extractAmountAndCurrency } = require('../lib/email/bcp/fallbackParser');

const FALLBACK_SENDERS = new Set([
  'notificaciones@notificacionesbcp.com.pe',
  'notificaciones@bcp.com.pe',
  'alertas@bcp.com.pe',
  'movimientos@bcp.com.pe',
  'bcp@bcp.com.pe',
]);

const TRANSACTIONAL_HINTS = [
  /monto/i,
  /consumo/i,
  /transferencia/i,
  /abono/i,
  /retiro/i,
  /pago/i,
  /n[uú]mero\s+de\s+operaci[oó]n/i,
];

const TEMPLATE_TYPE_MAP = {
  card_purchase: 'debit',
  online_purchase: 'debit',
  atm_withdrawal: 'withdrawal',
  account_transfer: 'transfer',
  incoming_credit: 'deposit',
  service_payment: 'payment',
  fee_commission: 'payment',
};

const TEMPLATE_CATEGORY_MAP = {
  card_purchase: 'shopping',
  online_purchase: 'shopping',
  atm_withdrawal: 'other',
  account_transfer: 'transfer',
  incoming_credit: 'income',
  service_payment: 'utilities',
  fee_commission: 'other',
};

const MIN_CONFIDENCE = Number(process.env.PARSER_V2_MIN_CONFIDENCE || '0.7');

function isKnownBcpSender(sender) {
  if (!sender) {
    return false;
  }
  const normalized = sender.toLowerCase();
  if (normalized.endsWith('@bcp.com.pe')) {
    return true;
  }

  for (const allowed of FALLBACK_SENDERS) {
    if (normalized.includes(allowed)) {
      return true;
    }
  }

  return false;
}

function hasTransactionalHints(subject, body) {
  const combined = `${subject || ''}\n${body || ''}`;
  return TRANSACTIONAL_HINTS.some((regex) => regex.test(combined));
}

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

function isTransactionalEmail(subject, content, emailMeta = {}) {
  const normalizedBody = normalizeEmailBody(content || '');
  const detection = detectTemplate(subject, normalizedBody);

  if (detection) {
    return true;
  }

  const sender = emailMeta.from ? String(emailMeta.from).toLowerCase() : '';
  if (isKnownBcpSender(sender) && hasTransactionalHints(subject, normalizedBody)) {
    logger.debug('Parser V2 fallback transactional detection triggered', {
      subject,
      sender,
    });
    return true;
  }

  return false;
}

function parseEmailContent(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('parseEmailContent expects an object with subject, html or text');
  }

  const {
    subject = '',
    html,
    text,
    receivedAt,
  } = payload;

  return parseBcpEmailV2({
    subject,
    html,
    text,
    receivedAt,
  });
}

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
  isTransactionalEmail,
  parseEmailContent,
  isValidParsedTransaction,
  createTransactionFromEmail,
  extractAmountAndCurrency,
};
