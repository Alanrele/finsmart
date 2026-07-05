/*
  Gestión de reglas de clasificación y catálogo de rubros.
  Todo determinístico: crear/editar/eliminar/reordenar reglas, probarlas,
  importar/exportar (JSON), crear regla desde un movimiento "Sin clasificar"
  y reclasificar movimientos pasados que aún no tienen rubro.
*/
const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/prisma');
const { getRules, getCategories, ensureSeeded } = require('../services/classificationStore');
const { classifyMovement, testRuleAgainstText, UNCLASSIFIED } = require('../lib/classification/rulesEngine');

const router = express.Router();

// ---- Categorías ----

router.get('/categories', async (req, res) => {
  const categories = await getCategories(req.user._id);
  res.json({ categories });
});

router.post('/categories', [
  body('key').isString().trim().isLength({ min: 1 }),
  body('label').isString().trim().isLength({ min: 1 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const userId = req.user._id;
  await ensureSeeded(userId);
  try {
    const category = await prisma.category.create({
      data: {
        userId,
        key: req.body.key.trim(),
        label: req.body.label.trim(),
        kind: req.body.kind || 'expense',
        color: req.body.color || '#71717A',
        sortOrder: Number.isFinite(req.body.sortOrder) ? req.body.sortOrder : 50,
      },
    });
    res.status(201).json({ category });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Ya existe un rubro con esa clave' });
    throw e;
  }
});

router.delete('/categories/:id', async (req, res) => {
  const cat = await prisma.category.findFirst({ where: { id: req.params.id, userId: req.user._id } });
  if (!cat) return res.status(404).json({ error: 'Rubro no encontrado' });
  if (cat.isSystem) return res.status(400).json({ error: 'No se puede eliminar un rubro del sistema' });
  await prisma.category.delete({ where: { id: cat.id } });
  res.json({ message: 'Rubro eliminado' });
});

// ---- Reglas ----

router.get('/', async (req, res) => {
  const rules = await getRules(req.user._id);
  res.json({ rules });
});

router.post('/', [
  body('category').isString().trim().isLength({ min: 1 }),
  body('pattern').isString().trim().isLength({ min: 1 }),
  body('matchType').optional().isIn(['keyword', 'regex']),
  body('field').optional().isIn(['description', 'merchant', 'all']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const userId = req.user._id;
  await ensureSeeded(userId);

  const rule = await prisma.classificationRule.create({
    data: {
      userId,
      category: req.body.category.trim(),
      matchType: req.body.matchType || 'keyword',
      pattern: req.body.pattern.trim(),
      field: req.body.field || 'all',
      priority: Number.isFinite(req.body.priority) ? req.body.priority : 100,
      enabled: req.body.enabled !== false,
    },
  });
  res.status(201).json({ rule });
});

router.patch('/:id', async (req, res) => {
  const userId = req.user._id;
  const existing = await prisma.classificationRule.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: 'Regla no encontrada' });

  const allowed = ['category', 'matchType', 'pattern', 'field', 'priority', 'enabled'];
  const data = {};
  for (const k of allowed) if (req.body[k] !== undefined) data[k] = req.body[k];

  const rule = await prisma.classificationRule.update({ where: { id: existing.id }, data });
  res.json({ rule });
});

router.delete('/:id', async (req, res) => {
  const userId = req.user._id;
  const existing = await prisma.classificationRule.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: 'Regla no encontrada' });
  await prisma.classificationRule.delete({ where: { id: existing.id } });
  res.json({ message: 'Regla eliminada' });
});

// Probar una regla contra texto de ejemplo (sin persistir)
router.post('/test', (req, res) => {
  const { rule, sampleText } = req.body || {};
  if (!rule || !rule.pattern) return res.status(400).json({ error: 'Regla y patrón requeridos' });
  const matched = testRuleAgainstText(rule, sampleText || '');
  res.json({ matched });
});

// Exportar el set de reglas (JSON de respaldo)
router.get('/export', async (req, res) => {
  const rules = await getRules(req.user._id);
  const clean = rules.map(({ category, matchType, pattern, field, priority, enabled }) =>
    ({ category, matchType, pattern, field, priority, enabled }));
  res.json({ version: 1, rules: clean });
});

// Importar un set de reglas (reemplaza o agrega)
router.post('/import', async (req, res) => {
  const userId = req.user._id;
  const incoming = Array.isArray(req.body?.rules) ? req.body.rules : null;
  if (!incoming) return res.status(400).json({ error: 'Formato inválido: se espera { rules: [...] }' });
  if (req.body.replace === true) {
    await prisma.classificationRule.deleteMany({ where: { userId } });
  }
  const data = incoming
    .filter((r) => r && r.category && r.pattern)
    .map((r) => ({
      userId,
      category: String(r.category),
      matchType: r.matchType === 'regex' ? 'regex' : 'keyword',
      pattern: String(r.pattern),
      field: ['description', 'merchant', 'all'].includes(r.field) ? r.field : 'all',
      priority: Number.isFinite(r.priority) ? r.priority : 100,
      enabled: r.enabled !== false,
    }));
  await prisma.classificationRule.createMany({ data });
  res.json({ imported: data.length });
});

/*
  Crear una regla a partir de un movimiento "Sin clasificar" y aplicarla.
  Body: { category, pattern, matchType?, field?, applyToPast? }
  - Crea la regla (prioridad alta por defecto para que gane).
  - Reclasifica el propio movimiento y, si applyToPast, todos los "unclassified"
    que coincidan con la nueva regla.
*/
router.post('/from-movement', async (req, res) => {
  const userId = req.user._id;
  const { category, pattern, matchType = 'keyword', field = 'all', applyToPast = true, transactionId } = req.body || {};
  if (!category || !pattern) return res.status(400).json({ error: 'category y pattern son requeridos' });
  await ensureSeeded(userId);

  const rule = await prisma.classificationRule.create({
    data: { userId, category, matchType, pattern, field, priority: 50, enabled: true },
  });

  let reclassified = 0;
  if (applyToPast) {
    const pending = await prisma.transaction.findMany({
      where: { userId, category: UNCLASSIFIED },
      select: { id: true, description: true, merchant: true },
    });
    for (const tx of pending) {
      const { category: cat, matched } = classifyMovement(tx, [rule]);
      if (matched) {
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { category: cat, ruleId: rule.id, isProcessed: true },
        });
        reclassified += 1;
      }
    }
  } else if (transactionId) {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { category, ruleId: rule.id, isProcessed: true },
    });
    reclassified = 1;
  }

  res.status(201).json({ rule, reclassified });
});

module.exports = router;
