const fs = require('fs');
const path = require('path');
const { parseBcpEmailV2 } = require('../../../src/lib/email/bcp/parseBcpEmailV2');

function loadFixture(name) {
  const filePath = path.join(__dirname, 'fixtures', name);
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

describe('parseBcpEmailV2', () => {
  test('normalizes PEN card purchase email', () => {
    const fixture = loadFixture('card_purchase_pen.json');
    const result = parseBcpEmailV2({
      subject: fixture.subject,
      text: fixture.text,
    });

    expect(result.success).toBe(true);
    expect(result.transaction.confidence).toBeGreaterThanOrEqual(0.75);
    expect(result.transaction).toMatchSnapshot('card_purchase_pen');
  });

  test('normalizes card purchase variations', () => {
    const htmlFixture = loadFixture('card_purchase_html.json');
    const htmlResult = parseBcpEmailV2({
      subject: htmlFixture.subject,
      html: htmlFixture.html,
    });

    expect(htmlResult.success).toBe(true);
    expect(htmlResult.transaction.amount.currency).toBe('PEN');
    expect(htmlResult.transaction.confidence).toBeGreaterThanOrEqual(0.75);

    const usdFixture = loadFixture('card_purchase_usd.json');
    const usdResult = parseBcpEmailV2({
      subject: usdFixture.subject,
      text: usdFixture.text,
    });

    expect(usdResult.success).toBe(true);
    expect(usdResult.transaction.amount.currency).toBe('USD');
    expect(usdResult.transaction.amount.value).toBe('58.30');
  });

  test('returns confidence 0 for non transactional content', () => {
    const fixture = loadFixture('non_transactional.json');
    const result = parseBcpEmailV2({
      subject: fixture.subject,
      text: fixture.text,
    });

    expect(result.success).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.notes).toContain('template_not_detected');
  });
});

