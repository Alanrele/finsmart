const fs = require('fs');
const path = require('path');

const emailParserService = require('../../../../src/adapters/msgraph/email/parserService');

function loadFixture(name) {
  const fixturePath = path.resolve(__dirname, '../../../email/bcp/fixtures', name);
  const raw = fs.readFileSync(fixturePath, 'utf8');
  return JSON.parse(raw);
}

describe('emailParserService - BCP integration', () => {
  const cardPurchaseFixture = loadFixture('card_purchase_pen.json');
  const nonTransactionalFixture = loadFixture('non_transactional.json');

  test('detects transactional BCP emails', () => {
    const detected = emailParserService.isTransactionalEmail(
      cardPurchaseFixture.subject,
      cardPurchaseFixture.text,
      { from: 'notificaciones@bcp.com.pe' },
    );

    expect(detected).toBe(true);
  });

  test('rejects non-transactional emails', () => {
    const detected = emailParserService.isTransactionalEmail(
      nonTransactionalFixture.subject,
      nonTransactionalFixture.text,
      { from: 'notificaciones@bcp.com.pe' },
    );

    expect(detected).toBe(false);
  });

  test('parses card purchase email into normalized transaction', () => {
    const parseResult = emailParserService.parseEmailContent({
      subject: cardPurchaseFixture.subject,
      text: cardPurchaseFixture.text,
      receivedAt: '2024-05-10T15:32:00-05:00',
    });

    expect(parseResult.success).toBe(true);
    expect(parseResult.transaction.template).toBe('card_purchase');

    const transactionData = emailParserService.createTransactionFromEmail(
      parseResult,
      'user-id-sample',
      {
        id: 'message-id',
        subject: cardPurchaseFixture.subject,
        receivedDateTime: '2024-05-10T15:32:00-05:00',
      },
    );

    expect(transactionData.amount).toBeCloseTo(125.9, 2);
    expect(transactionData.type).toBe('debit');
    expect(transactionData.category).toBe('shopping');
  });

  test('sanitises merchant name from noisy HTML content', () => {
    const html = `
      <html>
        <body>
          <table>
            <tr>
              <td>Empresa</td>
              <td>Pago en MP *ALIEXPRESSNumero de operacion348298 ¿No reconoces esta operacion? Comunicate inmediatamente al (01) 311-9898</td>
            </tr>
            <tr>
              <td>Monto</td>
              <td><strong>S/ 45.90</strong></td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const parseResult = emailParserService.parseEmailContent({
      subject: 'Notificacion de movimiento',
      html,
      receivedAt: '2024-10-12T21:15:00-05:00',
    });

    expect(parseResult.success).toBe(true);
    expect(parseResult.transaction.merchant).toBe('Pago en MP *ALIEXPRESS');
    expect(parseResult.transaction.amount.value).toBe('45.90');
  });
});
