const parser = require('../emailParserService');

describe('emailParserService', () => {
  test('blocks corporate/insurance notices as non-transactional', () => {
    const subject = 'Alerta BCP: Si decides realizar el cambio, debes enviarnos la Póliza';
    const content = 'Este correo informativo sobre tu póliza no requiere acción';
    expect(parser.isTransactionalEmail(subject, content)).toBe(false);
  });

  test('accepts transactional email with sufficient evidence', () => {
    const subject = 'BCP: Realizaste un consumo';
    const content = 'Monto: S/ 123.45 en TIENDA XYZ. Número de Operación 123456';
    expect(parser.isTransactionalEmail(subject, content)).toBe(true);
  });

  test('prefers consumption amount over saldo disponible in context', () => {
    const text1 = 'Saldo disponible: S/ 5,678.90. Monto de consumo: S/ 78.90';
    const parsed1 = parser.parseEmailContent(text1);
    expect(parsed1.amount).toBeCloseTo(78.90, 2);
    expect(parsed1.currency).toBe('PEN');

    const text2 = 'Monto de consumo: S/ 78.90. Saldo disponible: S/ 5,678.90';
    const parsed2 = parser.parseEmailContent(text2);
    expect(parsed2.amount).toBeCloseTo(78.90, 2);
    expect(parsed2.currency).toBe('PEN');
  });
});
