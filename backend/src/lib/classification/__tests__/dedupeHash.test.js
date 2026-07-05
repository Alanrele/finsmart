const { buildDedupeHash, toDayString, toAmountString } = require('../dedupeHash');

describe('buildDedupeHash', () => {
  const base = {
    date: '2026-03-15T14:32:00-05:00',
    amount: 55.5,
    description: 'PLAZA VEA San Miguel',
    account: '**** 1234',
  };

  test('es determinístico: misma entrada, mismo hash', () => {
    expect(buildDedupeHash(base)).toBe(buildDedupeHash({ ...base }));
  });

  test('re-subir el mismo movimiento con variaciones triviales da el mismo hash', () => {
    const variant = {
      date: '2026-03-15T09:00:00-05:00', // misma fecha real (día), otra hora
      amount: -55.5, // signo distinto, mismo valor absoluto
      description: '  plaza   vea  san miguel ',
      account: '1234',
    };
    expect(buildDedupeHash(variant)).toBe(buildDedupeHash(base));
  });

  test('cambia si cambia el monto', () => {
    expect(buildDedupeHash({ ...base, amount: 56 })).not.toBe(buildDedupeHash(base));
  });

  test('cambia si cambia el día', () => {
    expect(buildDedupeHash({ ...base, date: '2026-03-16T14:32:00-05:00' }))
      .not.toBe(buildDedupeHash(base));
  });

  test('cambia si cambia la descripción de fondo', () => {
    expect(buildDedupeHash({ ...base, description: 'Tottus Miraflores' }))
      .not.toBe(buildDedupeHash(base));
  });

  test('produce un sha256 hex de 64 chars', () => {
    expect(buildDedupeHash(base)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('helpers de hash', () => {
  test('toDayString normaliza a YYYY-MM-DD', () => {
    expect(toDayString('2026-03-15T23:59:00Z')).toBe('2026-03-15');
  });

  test('toAmountString usa 2 decimales y valor absoluto', () => {
    expect(toAmountString(-3)).toBe('3.00');
    expect(toAmountString(3.1)).toBe('3.10');
    expect(toAmountString('abc')).toBe('0.00');
  });
});
