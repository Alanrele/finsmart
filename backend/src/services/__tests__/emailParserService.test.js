const fs = require('fs');
const path = require('path');

const emailParserService = require('../emailParserService');

function loadFixture(name) {
  const fixturePath = path.resolve(
    __dirname,
    '../../../tests/email/bcp/fixtures',
    name,
  );
  const raw = fs.readFileSync(fixturePath, 'utf8');
  return JSON.parse(raw);
}

describe('emailParserService (V2)', () => {
  const cardPurchaseFixture = loadFixture('card_purchase_pen.json');
  const nonTransactionalFixture = loadFixture('non_transactional.json');

  test('detects transactional emails from BCP card purchase notifications', () => {
    const detected = emailParserService.isTransactionalEmail(
      cardPurchaseFixture.subject,
      cardPurchaseFixture.text,
      { from: 'notificaciones@bcp.com.pe' },
    );

    expect(detected).toBe(true);
  });

  test('parses card purchase email into normalized transaction and maps to persistence payload', () => {
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
    expect(transactionData.aiAnalysis.confidence).toBeGreaterThan(0.7);
  });

  test('flags non-transactional emails as invalid for persistence', () => {
    const parseResult = emailParserService.parseEmailContent({
      subject: nonTransactionalFixture.subject,
      text: nonTransactionalFixture.text,
    });

    expect(parseResult.success).toBe(false);
    expect(parseResult.confidence).toBe(0);
    expect(
      emailParserService.isValidParsedTransaction(parseResult, {
        subject: nonTransactionalFixture.subject,
      }),
    ).toBe(false);
  });

  test('uses cheerio fallback parser when template detection fails', () => {
    const html = `
      <html>
        <body>
          <table>
            <tr>
              <td>Fecha y hora</td>
              <td>15 de octubre de 2024 - 10:45 AM</td>
            </tr>
            <tr>
              <td>Operación realizada</td>
              <td>Transferencia a terceros</td>
            </tr>
            <tr>
              <td>Número de operación</td>
              <td>ABC12345</td>
            </tr>
            <tr>
              <td>Canal</td>
              <td>App BCP</td>
            </tr>
            <tr>
              <td>Enviado a</td>
              <td>Juan Perez 1234</td>
            </tr>
            <tr>
              <td>Monto transferido</td>
              <td><b>S/ 150.00</b></td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const parseResult = emailParserService.parseEmailContent({
      subject: 'Notificacion de movimiento en tu cuenta',
      html,
      text: null,
      receivedAt: '2024-10-15T15:45:00-05:00',
    });

    expect(parseResult.success).toBe(true);
    expect(parseResult.transaction.template).toBe('account_transfer');
    expect(parseResult.transaction.amount.value).toBe('150.00');
    expect(parseResult.transaction.amount.currency).toBe('PEN');
    expect(parseResult.transaction.operationId).toBe('ABC12345');
    expect(parseResult.transaction.confidence).toBeGreaterThanOrEqual(0.7);
  });
});
