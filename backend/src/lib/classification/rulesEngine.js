const { normalizeDescription } = require('./normalizeText');
const { UNCLASSIFIED } = require('./categories');

/*
  Motor de clasificación por RUBRO — 100% determinístico y auditable.
  NO usa IA ni probabilidades: la misma entrada siempre da el mismo rubro.

  Una regla:
    {
      id, category,            // rubro destino (key del catálogo)
      matchType: 'keyword' | 'regex',
      pattern,                 // texto o fuente de regex
      field: 'description' | 'merchant' | 'all',  // dónde buscar (def: 'all')
      priority,                // menor = se evalúa antes
      enabled                  // def: true
    }

  Evaluación: se ordena por prioridad ascendente (y por id como desempate
  estable); la PRIMERA regla habilitada que coincide gana. Si ninguna
  coincide → categoría UNCLASSIFIED (nunca se adivina).

  El mismo motor y la misma tabla de reglas sirven para movimientos de PDF
  y de correo, porque ambos aportan { description, merchant }.
*/

function buildHaystacks(movement) {
  const description = normalizeDescription(movement.description || '');
  const merchant = normalizeDescription(movement.merchant || '');
  return {
    description,
    merchant,
    all: normalizeDescription(`${movement.description || ''} ${movement.merchant || ''}`),
  };
}

function compileRule(rule) {
  const field = rule.field || 'all';
  if (rule.matchType === 'regex') {
    // Las reglas se guardan por el usuario; se compila la fuente tal cual,
    // insensible a mayúsculas. Si es inválida, la regla se ignora (no rompe).
    let regex = null;
    try {
      regex = new RegExp(rule.pattern, 'i');
    } catch (_) {
      regex = null;
    }
    return { ...rule, field, _regex: regex };
  }
  // keyword: comparación por subcadena sobre texto normalizado
  return { ...rule, field, _needle: normalizeDescription(rule.pattern) };
}

function ruleMatches(compiled, haystacks) {
  const haystack = haystacks[compiled.field] ?? haystacks.all;
  if (compiled.matchType === 'regex') {
    if (!compiled._regex) return false;
    return compiled._regex.test(haystack);
  }
  if (!compiled._needle) return false;
  return haystack.includes(compiled._needle);
}

function sortRules(rules) {
  return [...rules].sort((a, b) => {
    const pa = Number.isFinite(a.priority) ? a.priority : 1000;
    const pb = Number.isFinite(b.priority) ? b.priority : 1000;
    if (pa !== pb) return pa - pb;
    // desempate estable para garantizar determinismo
    return String(a.id ?? '').localeCompare(String(b.id ?? ''));
  });
}

/*
  Clasifica un movimiento. Devuelve { category, ruleId, matched }.
  matched=false ⇒ category === UNCLASSIFIED.
*/
function classifyMovement(movement, rules = []) {
  const haystacks = buildHaystacks(movement);
  const ordered = sortRules(rules.filter(r => r.enabled !== false));

  for (const rule of ordered) {
    const compiled = compileRule(rule);
    if (ruleMatches(compiled, haystacks)) {
      return { category: rule.category, ruleId: rule.id ?? null, matched: true };
    }
  }
  return { category: UNCLASSIFIED, ruleId: null, matched: false };
}

/*
  Prueba una sola regla contra un texto de ejemplo (para la vista de gestión).
*/
function testRuleAgainstText(rule, sampleText) {
  const haystacks = buildHaystacks({ description: sampleText, merchant: sampleText });
  return ruleMatches(compileRule(rule), haystacks);
}

/*
  Set de reglas por defecto para comercios/patrones peruanos comunes.
  Prioridades bajas = más específicas primero. Editable por el usuario.
*/
const DEFAULT_RULES = [
  // Ingresos / sueldo
  { category: 'income', matchType: 'regex', field: 'all', pattern: '\\b(abono de haberes|deposito de sueldo|remuneracion|planilla|haberes|deposito cts)\\b', priority: 10 },
  // Combustible / transporte
  { category: 'transport', matchType: 'regex', field: 'all', pattern: '\\b(primax|repsol|petroperu|pecsa|grifo|combustible|uber|beat|indriver|cabify|peaje)\\b', priority: 20 },
  // Alimentación
  { category: 'food', matchType: 'regex', field: 'all', pattern: '\\b(plaza vea|tottus|metro|wong|makro|vivanda|rappi|pedidosya|kfc|bembos|starbucks|restaurant|mercado|panaderia)\\b', priority: 30 },
  // Servicios (agua, luz, telefonía, internet)
  { category: 'utilities', matchType: 'regex', field: 'all', pattern: '\\b(sedapal|luz del sur|enel|movistar|claro|entel|bitel|netflix|spotify|recibo|servicio de)\\b', priority: 40 },
  // Salud
  { category: 'healthcare', matchType: 'regex', field: 'all', pattern: '\\b(inkafarma|mifarma|boticas|farmacia|clinica|essalud|laboratorio)\\b', priority: 50 },
  // Compras / retail
  { category: 'shopping', matchType: 'regex', field: 'all', pattern: '\\b(saga|falabella|ripley|oechsle|promart|sodimac|linio|mercado libre|aliexpress|amazon)\\b', priority: 60 },
  // Entretenimiento
  { category: 'entertainment', matchType: 'regex', field: 'all', pattern: '\\b(cineplanet|cinemark|steam|playstation|xbox|spotify|disney)\\b', priority: 70 },
  // Yape: categoría propia, gana antes que la regla genérica de transferencias
  { category: 'yape', matchType: 'regex', field: 'all', pattern: '\\byape\\b', priority: 75 },
  // Transferencias (Plin/interbancarias)
  { category: 'transfer', matchType: 'regex', field: 'all', pattern: '\\b(plin|transferencia|interbancaria|cci|envio a|transferencia a)\\b', priority: 80 },
];

module.exports = {
  classifyMovement,
  testRuleAgainstText,
  sortRules,
  compileRule,
  DEFAULT_RULES,
  UNCLASSIFIED,
};
