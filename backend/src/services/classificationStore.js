/*
  Acceso a reglas y categorías del usuario (tablas nuevas, vía Prisma directo).
  Siembra el catálogo por defecto y las reglas base la primera vez, para que el
  motor determinístico tenga con qué clasificar sin intervención.
*/
const { prisma } = require('../config/prisma');
const { DEFAULT_CATEGORIES } = require('../lib/classification/categories');
const { DEFAULT_RULES } = require('../lib/classification/rulesEngine');

async function ensureSeeded(userId) {
  const count = await prisma.category.count({ where: { userId } });
  if (count > 0) return;

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
