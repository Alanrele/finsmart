/*
  Acceso a reglas y categorías del usuario (tablas nuevas, vía Prisma directo).
  Siembra el catálogo por defecto y las reglas base la primera vez, para que el
  motor determinístico tenga con qué clasificar sin intervención.
*/
const { prisma } = require('../config/prisma');
const { DEFAULT_CATEGORIES } = require('../lib/classification/categories');
const { DEFAULT_RULES } = require('../lib/classification/rulesEngine');

/*
  Alta de la categoría "Yape" para usuarios sembrados ANTES de que existiera:
  crea la categoría y su regla (prioridad 75, gana a la de transferencias) y
  reclasifica retroactivamente todo movimiento que mencione yape. Idempotente:
  si la categoría ya existe, no hace nada.
*/
async function ensureYapeUpgrade(userId) {
  const existing = await prisma.category.findFirst({ where: { userId, key: 'yape' } });
  if (existing) return;

  await prisma.category.create({
    data: {
      userId, key: 'yape', label: 'Yape', kind: 'both',
      color: '#84A595', sortOrder: 10, isSystem: true,
    },
  });

  const rule = await prisma.classificationRule.create({
    data: {
      userId, category: 'yape', matchType: 'regex',
      pattern: '\\byape\\b', field: 'all', priority: 75, enabled: true,
    },
  });

  await prisma.transaction.updateMany({
    where: {
      userId,
      OR: [
        { description: { contains: 'yape', mode: 'insensitive' } },
        { merchant: { contains: 'yape', mode: 'insensitive' } },
        { rawText: { contains: 'yape', mode: 'insensitive' } },
      ],
    },
    data: { category: 'yape', ruleId: rule.id, isProcessed: true },
  });
}

async function ensureSeeded(userId) {
  const count = await prisma.category.count({ where: { userId } });
  if (count > 0) {
    // Ya sembrado: solo garantiza las altas incrementales del catálogo
    await ensureYapeUpgrade(userId);
    return;
  }

  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({
      userId,
      key: c.key,
      label: c.label,
      kind: c.kind,
      color: c.color,
      sortOrder: c.sortOrder,
      isSystem: true,
    })),
    skipDuplicates: true,
  });

  await prisma.classificationRule.createMany({
    data: DEFAULT_RULES.map((r) => ({
      userId,
      category: r.category,
      matchType: r.matchType,
      pattern: r.pattern,
      field: r.field || 'all',
      priority: r.priority,
      enabled: true,
    })),
  });
}

async function getRules(userId) {
  await ensureSeeded(userId);
  return prisma.classificationRule.findMany({
    where: { userId },
    orderBy: [{ priority: 'asc' }, { id: 'asc' }],
  });
}

async function getCategories(userId) {
  await ensureSeeded(userId);
  return prisma.category.findMany({
    where: { userId },
    orderBy: { sortOrder: 'asc' },
  });
}

module.exports = { ensureSeeded, getRules, getCategories };
