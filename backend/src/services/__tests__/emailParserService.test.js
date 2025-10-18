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

  test('sanitizes merchant field when description contains extra guidance text', () => {
    const html = `
      <html>
        <body>
          <table>
            <tr>
              <td>Fecha y hora</td>
              <td>12 de octubre de 2024 - 09:15 PM</td>
            </tr>
            <tr>
              <td>Operacion realizada</td>
              <td>Pago</td>
            </tr>
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

  test('parses plain text merchant guidance snippet with fallback', () => {
    const text = 'Pago en MP *ALIEXPRESSNumero de operacion348298 ¿No reconoces esta operacion? Comunicate inmediatamente con nosotros al(01) 311-9898 anexo *225 para ayudarte a verificarla. ¡Seguimos mejorando para ti! Monto: S/ 45.90';

    const parseResult = emailParserService.parseEmailContent({
      subject: 'Pago en MP *ALIEXPRESS',
      text,
      receivedAt: '2024-10-15T15:45:00-05:00',
    });

    expect(parseResult.success).toBe(true);
    expect(parseResult.transaction.template).toBe('account_transfer');
    expect(parseResult.transaction.merchant).toBe('Pago en MP *ALIEXPRESS');
    expect(parseResult.transaction.amount.value).toBe('45.90');
    expect(parseResult.transaction.amount.currency).toBe('PEN');
  });

  test('parses BCP refund notification and captures merchant and card details', () => {
    const text = [
      'Hola Alan Raul,',
      '',
      'Se ha devuelto el monto de $ 10.00 a tu cuenta BCP.',
      '',
      'Monto',
      '',
      'Total devuelto\t$ 10.00',
      '',
      'Datos de la operacion',
      '',
      'Fecha y hora\t04 de octubre de 2025 - 06:01 PM',
      'Numero de Tarjeta\t************9246',
      'Nombre del Comercio\tGITHUB, INC.',
      'Numero de operacion\t325121',
    ].join('\n');

    const parseResult = emailParserService.parseEmailContent({
      subject: 'Devolucion BCP',
      text,
      receivedAt: '2025-10-04T18:01:00-05:00',
    });

    expect(parseResult.success).toBe(true);
    expect(parseResult.transaction.template).toBe('incoming_credit');
    expect(parseResult.transaction.amount.value).toBe('10.00');
    expect(parseResult.transaction.amount.currency).toBe('USD');
    expect(parseResult.transaction.merchant).toBe('GITHUB, INC.');
    expect(parseResult.transaction.cardLast4).toBe('9246');
    expect(parseResult.transaction.operationId).toBe('325121');
  });

  test('parses BCP credit card consumption summary with merchant and card digits', () => {
    const text = [
      'Hola Alan Raul,',
      '',
      'Realizaste un consumo de S/ 140.00 con tu Tarjeta de Credito BCP en DLC*STARLINK INTERNET.',
      '',
      'Por tu seguridad, te enviamos los datos de tu operacion.',
      '',
      'Monto',
      '',
      'Total del consumo\tS/ 140.00',
      '',
      'Datos de la operacion',
      '',
      'Operacion realizada\tConsumo Tarjeta de Credito',
      'Fecha y hora\t05 de octubre de 2025 - 01:25 AM',
      'Numero de Tarjeta de Credito\t************1311',
      'Empresa\tDLC*STARLINK INTERNET',
      'Numero de operacion\t0000610710',
    ].join('\n');

    const parseResult = emailParserService.parseEmailContent({
      subject: 'Consumo Tarjeta BCP',
      text,
      receivedAt: '2025-10-05T01:25:00-05:00',
    });

    expect(parseResult.success).toBe(true);
    expect(parseResult.transaction.template).toBe('card_purchase');
    expect(parseResult.transaction.amount.value).toBe('140.00');
    expect(parseResult.transaction.amount.currency).toBe('PEN');
    expect(parseResult.transaction.merchant).toBe('DLC*STARLINK INTERNET');
    expect(parseResult.transaction.cardLast4).toBe('1311');
    expect(parseResult.transaction.operationId).toBe('0000610710');
  });

  test('parses BCP service payment receipt with service metadata', () => {
    const text = [
      'Hola ALAN RAUL,',
      '',
      'Tu operacion se realizo con exito!',
      '',
      'Operacion realizada:',
      '',
      'Pago de servicios',
      '',
      'Numero de operacion:',
      '',
      '05130564',
      '',
      'Fecha y hora: Sabado, 04 Octubre 2025 - 08:17 PM',
      'Empresa: PLUZ ANTES ENEL DISTRIBUCION LUZ',
      'Servicio: PLUZ ANTES ENELDISTRIBUCIONLUZ',
      'Titular del servicio: REY** EGUSQUI** RA** EUGEN**',
      'Codigo de usuario: 1874364',
      'Cuenta de origen: Cuenta de ahorros',
      '**** 9039',
      'ALAN RAUL',
      'Monto total: S/ 175.00',
      '',
      'Doc. pago: 000000000000000000000001874364',
      'Vencimiento: 23/09/2025',
      'Importe: S/ 175.00',
      'Cargo fijo: S/ 0.00',
      'Mora: S/ 0.00',
    ].join('\n');

    const parseResult = emailParserService.parseEmailContent({
      subject: 'Pago de servicios BCP',
      text,
      receivedAt: '2025-10-04T20:17:00-05:00',
    });

    expect(parseResult.success).toBe(true);
    expect(parseResult.transaction.template).toBe('service_payment');
    expect(parseResult.transaction.amount.value).toBe('175.00');
    expect(parseResult.transaction.merchant).toBe('PLUZ ANTES ENEL DISTRIBUCION LUZ');
    expect(parseResult.transaction.accountRef).toBe('9039');
    expect(parseResult.transaction.operationId).toBe('05130564');
    expect(parseResult.transaction.notes).toContain('Servicio: PLUZ ANTES ENELDISTRIBUCIONLUZ');
  });
});
