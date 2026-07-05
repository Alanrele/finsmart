const { normalizeDescription, normalizeAccount } = require('../normalizeText');

describe('normalizeDescription', () => {
  test('minúsculas, sin acentos y espacios colapsados', () => {
    expect(normalizeDescription('  PLIN  a  Júan  Pérez ')).toBe('plin a juan perez');
  });

  test('variaciones triviales convergen al mismo valor', () => {
    const a = normalizeDescription('PRIMAX ESTACIÓN 123');
    const b = normalizeDescription('primax   estacion 123');
    expect(a).toBe(b);
  });

  test('maneja null/undefined/número', () => {
    expect(normalizeDescription(null)).toBe('');
    expect(normalizeDescription(undefined)).toBe('');
    expect(normalizeDescription(42)).toBe('42');
  });

  test('elimina caracteres de control', () => {
    expect(normalizeDescription('pago\tluz\n\r del sur')).toBe('pago luz del sur');
  });
});

describe('normalizeAccount', () => {
  test('conserva solo alfanuméricos en minúscula', () => {
    expect(normalizeAccount('**** 1234')).toBe('1234');
    expect(normalizeAccount('Cuenta-Ahorros N° 007')).toBe('cuentaahorrosn007');
  });
});
