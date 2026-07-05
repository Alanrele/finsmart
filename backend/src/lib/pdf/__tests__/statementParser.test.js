const { parseStatementLine, parseStatementText, toIsoDay } = require('../statementParser');

describe('parseStatementLine', () => {
  test('extrae fecha, descripción, monto (gasto) con saldo al final', () => {
    const mv = parseStatementLine('15/03  PLAZA VEA SAN MIGUEL           55.50    1,200.00', { year: 2026 });
    expect(mv).toMatchObject({
      description: 'PLAZA VEA SAN MIGUEL',
      amount: 55.5,
      type: 'expense',
      currency: 'PEN',
    });
    expect(mv.date).toBe('2026-03-15T00:00:00-05:00');
  });

  test('detecta ingreso por pista de texto (abono de haberes)', () => {
    const mv = parseStatementLine('30/03  ABONO DE HABERES EMPRESA SAC   2,500.00   3,700.00', { year: 2026 });
    expect(mv.type).toBe('income');
    expect(mv.amount).toBe(2500);
  });

  test('usa el año de la línea si viene con año de 4 dígitos', () => {
    const mv = parseStatementLine('05/01/2025 PAGO LUZ DEL SUR 90.00', { year: 2026 });
    expect(mv.date).toBe('2025-01-05T00:00:00-05:00');
  });

  test('un solo token monetario se toma como importe', () => {
    const mv = parseStatementLine('10/03 UBER TRIP LIMA 18.90', { year: 2026 });
    expect(mv.amount).toBe(18.9);
  });

  test('reconoce moneda USD', () => {
    const mv = parseStatementLine('12/03 NETFLIX.COM US$ 12.99 US$ 12.99', { year: 2026 });
    expect(mv.currency).toBe('USD');
  });

  test('línea sin fecha inicial => null', () => {
    expect(parseStatementLine('Saldo anterior 1000.00', { year: 2026 })).toBeNull();
  });

  test('línea sin monto => null', () => {
    expect(parseStatementLine('15/03 SOLO TEXTO SIN MONTO', { year: 2026 })).toBeNull();
  });

  test('layout con columnas cargo/abono asigna tipo por posición', () => {
    // fecha  desc            cargo     abono     saldo
    const cargo = parseStatementLine('15/03 COMPRA POS 100.00 0.00 900.00', { year: 2026, columns: { debitFirst: true } });
    expect(cargo.type).toBe('expense');
    const abono = parseStatementLine('16/03 TRANSFERENCIA RECIBIDA 0.00 300.00 1200.00', { year: 2026, columns: { debitFirst: true } });
    expect(abono.type).toBe('income');
  });
});

describe('parseStatementText', () => {
  const sample = [
    'BANCO DE CREDITO - ESTADO DE CUENTA MARZO 2026',
    'Fecha  Descripcion  Monto  Saldo',
    '15/03  PLAZA VEA SAN MIGUEL   55.50   1,200.00',
    '18/03  PRIMAX ESTACION 45   120.00   1,080.00',
    '30/03  ABONO DE HABERES   2,500.00   3,580.00',
    'Saldo final   3,580.00',
  ].join('\n');

  test('extrae solo las filas de movimiento (3) e ignora encabezados', () => {
    const { movements, scanned } = parseStatementText(sample, { year: 2026, source: 'pdf:marzo.pdf', account: 'Ahorros 1234' });
    expect(scanned).toBe(false);
    expect(movements).toHaveLength(3);
    expect(movements[0]).toMatchObject({ description: 'PLAZA VEA SAN MIGUEL', amount: 55.5, source: 'pdf:marzo.pdf', account: 'Ahorros 1234' });
    expect(movements[2].type).toBe('income');
  });

  test('asigna cada movimiento a su fecha real (no la de importación)', () => {
    const { movements } = parseStatementText(sample, { year: 2026 });
    expect(movements.map(m => m.date.slice(0, 7))).toEqual(['2026-03', '2026-03', '2026-03']);
  });

  test('texto vacío => scanned=true, sin inventar movimientos', () => {
    const res = parseStatementText('', { year: 2026 });
    expect(res.scanned).toBe(true);
    expect(res.movements).toHaveLength(0);
  });

  test('líneas con fecha pero sin monto van a unparsable (no se fingen)', () => {
    const { movements, unparsable } = parseStatementText('15/03 LINEA ROTA SIN IMPORTE', { year: 2026 });
    expect(movements).toHaveLength(0);
    expect(unparsable).toHaveLength(1);
  });
});

describe('toIsoDay', () => {
  test('rechaza mes inválido', () => {
    expect(toIsoDay(10, 13, 2026)).toBeNull();
  });
});
