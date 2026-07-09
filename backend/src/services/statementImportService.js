/*
  Orquesta la importación de movimientos de un estado de cuenta PDF:
  parseo -> clasificación determinística -> dedup por hash -> persistencia.

  Devuelve el resumen exigido: { new, duplicates, unclassified, scanned }.
  Re-subir el mismo PDF produce el mismo dedupeHash por movimiento, por lo que
  no inserta nada nuevo ni altera saldos.
*/
const { prisma } = require('../config/prisma');
const { parseStatementText } = require('../lib/pdf/statementParser');
const { classifyMovement, UNCLASSIFIED } = require('../lib/classification/rulesEngine');
const { buildDedupeHash } = require('../lib/classification/dedupeHash');
const { getRules } = require('./classificationStore');

// Mapea el tipo de movimiento del parser (income/expense) al enum de Transaction.
function toTransactionType(movementType) {
  return movementType === 'income' ? 'credit' : 'debit';
}

async function importStatement({ userId, text, year, fileName, account, columns }) {
  const source = fileName ? `pdf:${fileName}` : 'pdf';
  const { movements, unparsable, scanned } = parseStatementText(text, {
    year,
    source,
    account,
    columns,
  });

  if (scanned) {
    return { new: 0, duplicates: 0, unclassified: 0, scanned: true, unparsable: [], movements: [] };
  }

  const rules = await getRules(userId);

  let created = 0;
  let duplicates = 0;
  let unclassifiedCount = 0;
  const createdMovements = [];

  for (const mv of movements) {
    const dedupeHash = buildDedupeHash({
      date: mv.date,
      amount: mv.amount,
      description: mv.description,
      account: mv.account || account || '',
    });

    // Dedup: si ya existe la huella para este usuario, se omite.
    const existing = await prisma.transaction.findFirst({
      where: { userId, dedupeHash },
      select: { id: true },
    });
    if (existing) {
      duplicates += 1;
      continue;
    }

    const { category, ruleId, matched } = classifyMovement(mv, rules);
    if (!matched) unclassifiedCount += 1;

    // messageId único: incluye el userId porque la columna es única GLOBAL;
    // sin él, dos usuarios con el mismo movimiento (mismo hash) colisionan.
    const messageId = `pdf:${userId}:${dedupeHash}`;

    try {
      const row = await prisma.transaction.create({
        data: {
          userId,
          messageId,
          amount: mv.amount,
          currency: mv.currency || 'PEN',
          type: toTransactionType(mv.type),
          category,
          description: mv.description,
          channel: 'other',
          date: new Date(mv.date),
          rawText: mv.description.slice(0, 1000),
          isProcessed: matched,
          origin: 'pdf',
          sourceFile: fileName || null,
          account: mv.account || account || null,
          dedupeHash,
          ruleId: ruleId || null,
        },
      });
      created += 1;
      createdMovements.push(row);
    } catch (err) {
      // P2002 = violación de unicidad: el movimiento ya existe (respaldo del
      // dedup a nivel de BD); se cuenta como duplicado en vez de fallar todo.
      if (err && err.code === 'P2002') {
        duplicates += 1;
        if (!matched) unclassifiedCount -= 1;
      } else {
        throw err;
      }
    }
  }

  return {
    new: created,
    duplicates,
    unclassified: unclassifiedCount,
    scanned: false,
    unparsable,
    movements: createdMovements,
  };
}

module.exports = { importStatement, toTransactionType, UNCLASSIFIED };
