const logger = require('../../../../infrastructure/logging/logger');
const { normalizeEmailBody } = require('../../lib/email/normalize');
const { detectTemplate } = require('../../lib/email/bcp/detectTemplate');
const { FALLBACK_SENDERS, TRANSACTIONAL_HINTS } = require('./constants');

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

module.exports = {
  isTransactionalEmail,
};
