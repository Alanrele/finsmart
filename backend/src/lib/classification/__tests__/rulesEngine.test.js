const {
  classifyMovement,
  testRuleAgainstText,
  DEFAULT_RULES,
  UNCLASSIFIED,
} = require('../rulesEngine');

describe('classifyMovement (motor determinístico)', () => {
  test('clasifica combustible por keyword de comercio', () => {
    const r = classifyMovement({ description: 'Consumo PRIMAX EST 45 Lima' }, DEFAULT_RULES);
    expect(r.category).toBe('transport');
    expect(r.matched).toBe(true);
  });

  test('lo desconocido cae en Sin clasificar (nunca adivina)', () => {
    const r = classifyMovement({ description: 'XZ COMERCIO RARO 999' }, DEFAULT_RULES);
    expect(r.category).toBe(UNCLASSIFIED);
    expect(r.matched).toBe(false);
    expect(r.ruleId).toBeNull();
  });

  test('es 100% consistente: misma entrada, mismo resultado', () => {
    const mv = { description: 'NETFLIX.COM suscripcion' };
    const a = classifyMovement(mv, DEFAULT_RULES);
    const b = classifyMovement(mv, DEFAULT_RULES);
    expect(a).toEqual(b);
  });

  test('respeta el orden de prioridad: la primera que coincide gana', () => {
    const rules = [
      { id: 'b', category: 'transfer', matchType: 'keyword', pattern: 'plin', priority: 80 },
      { id: 'a', category: 'food',     matchType: 'keyword', pattern: 'plin', priority: 10 },
    ];
    const r = classifyMovement({ description: 'PLIN a Juan' }, rules);
    expect(r.category).toBe('food'); // priority 10 gana sobre 80
    expect(r.ruleId).toBe('a');
  });

  test('ignora reglas deshabilitadas', () => {
    const rules = [
      { id: 'x', category: 'food', matchType: 'keyword', pattern: 'metro', priority: 10, enabled: false },
    ];
    expect(classifyMovement({ description: 'METRO San Borja' }, rules).category).toBe(UNCLASSIFIED);
  });

  test('regex inválida no rompe: la regla se ignora', () => {
    const rules = [
      { id: 'bad', category: 'food', matchType: 'regex', pattern: '([', priority: 10 },
    ];
    expect(() => classifyMovement({ description: 'algo' }, rules)).not.toThrow();
    expect(classifyMovement({ description: 'algo' }, rules).category).toBe(UNCLASSIFIED);
  });

  test('field=merchant solo mira el comercio', () => {
    const rules = [
      { id: 'm', category: 'shopping', matchType: 'keyword', pattern: 'ripley', field: 'merchant', priority: 10 },
    ];
    expect(classifyMovement({ description: 'compra ripley', merchant: 'otro' }, rules).category).toBe(UNCLASSIFIED);
    expect(classifyMovement({ description: 'compra', merchant: 'RIPLEY SA' }, rules).category).toBe('shopping');
  });
});

describe('testRuleAgainstText', () => {
  test('valida coincidencia de una regla contra ejemplo', () => {
    const rule = { category: 'transport', matchType: 'keyword', pattern: 'uber' };
    expect(testRuleAgainstText(rule, 'Cargo UBER TRIP')).toBe(true);
    expect(testRuleAgainstText(rule, 'Cargo taxi directo')).toBe(false);
  });
});
