const { mergeTransactions } = require('../../../src/lib/email/bcp/mergeParserResults');

function buildResult(overrides = {}) {
  const transaction = {
    template: 'service_payment',
    amount: { value: '10.00', currency: 'PEN' },
    confidence: 0.8,
    ...overrides.transaction,
  };

  const result = {
    version: 'v2',
    success: true,
    template: transaction.template,
    transaction,
    confidence: transaction.confidence,
  };

  Object.entries(overrides).forEach(([key, value]) => {
    if (key === 'transaction') {
      return;
    }
    result[key] = value;
  });

  return result;
}

describe('mergeTransactions', () => {
  test('returns primary when fallback is missing', () => {
    const primary = buildResult();
    expect(mergeTransactions(primary, null)).toEqual(primary);
  });

  test('prefers fallback result when confidence is higher', () => {
    const primary = buildResult();
    const fallback = buildResult({
      transaction: {
        confidence: 0.95,
        merchant: 'Comercio',
      },
    });

    const merged = mergeTransactions(primary, fallback);

    expect(merged.transaction.merchant).toBe('Comercio');
    expect(merged.confidence).toBe(0.95);
  });

  test('fills missing fields from fallback', () => {
    const primary = buildResult({
      transaction: {
        merchant: '',
        accountRef: '',
      },
    });
    const fallback = buildResult({
      transaction: {
        merchant: 'Beneficiario X',
        accountRef: '1234',
      },
    });

    const merged = mergeTransactions(primary, fallback);

    expect(merged.transaction.merchant).toBe('Beneficiario X');
    expect(merged.transaction.accountRef).toBe('1234');
  });

  test('replaces noisy strings with cleaner fallback values', () => {
    const primary = buildResult({
      transaction: {
        channel: 'Banca Movil BCP Numero de operacion 04807225',
      },
    });
    const fallback = buildResult({
      transaction: {
        channel: 'Banca Movil BCP',
      },
    });

    const merged = mergeTransactions(primary, fallback);

    expect(merged.transaction.channel).toBe('Banca Movil BCP');
  });

  test('merges notes without duplication', () => {
    const primary = buildResult({
      transaction: {
        notes: 'Beneficiario: Juan',
      },
    });
    const fallback = buildResult({
      transaction: {
        notes: 'Servicio: Luz',
      },
    });

    const merged = mergeTransactions(primary, fallback);

    expect(merged.transaction.notes).toContain('Beneficiario: Juan');
    expect(merged.transaction.notes).toContain('Servicio: Luz');
  });
});
