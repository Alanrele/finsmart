const { parseBcpEmailV2 } = require('../../lib/email/bcp/parseBcpEmailV2');

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

module.exports = {
  parseEmailContent,
};
