/*
  Ingesta determinística de correos BCP parseados → movimientos persistidos.

  ÚNICO punto de entrada para convertir un resultado del parser V2 en una
  transacción. Garantiza, en este orden:

  1. VALIDACIÓN ESTRICTA por plantilla: si falta una etiqueta esperada
     (monto, fecha, comercio, tarjeta, nro. de operación en consumos), el
     correo NO se inserta: va a la bandeja de revisión (email_reviews), se
     loguea ruidosamente y se notifica por socket. Cero datos inventados.

  2. DEDUPLICACIÓN en 3 niveles (en orden de fuerza):
       a) numero de operación del BCP (llave más fuerte; además hay índice
          UNIQUE parcial (userId, operationNumber) en BD como respaldo)
       b) messageId del proveedor de correo (reprocesos/reenvíos)
       c) dedupeHash (fecha+monto+descr.normalizada+cuenta): red de seguridad
          para cruzar con movimientos que entraron por PDF
     Un movimiento que entró por PDF y luego llega por correo (o viceversa)
     no se duplica: el nro. de operación los cruza cuando ambos lo tienen,
     y el hash cubre el resto.

  3. CLASIFICACIÓN con el motor de reglas determinístico existente, sobre el
     comercio NORMALIZADO. Sin regla que coincida → 'unclassified'. Nunca se
     adivina una categoría.

  `deps` permite inyectar prisma/getRules en pruebas unitarias.
*/
const { prisma: defaultPrisma } = require('../config/prisma');
const { getRules: defaultGetRules } = require('./classificationStore');
const { classifyMovement, UNCLASSIFIED } = require('../lib/classification/rulesEngine');
const { buildDedupeHash } = require('../lib/classification/dedupeHash');
const { normalizeMerchant } = require('../lib/email/normalizeMerchant');
const { createTransactionFromEmail } = require('./emailParser/mapper');

const ORIGIN_EMAIL_BCP = 'email_bcp';
const MAX_ALLOWED_AMOUNT = 10_000_000; // sanity guard existente (S/ 10M)

/*
  Etiquetas/campos requeridos por plantilla. Consumos con tarjeta exigen la
  plantilla completa del correo "Datos de la operación"; el resto exige el
  mínimo para no inventar nada (monto y fecha reales).
*/
const REQUIRED_FIELDS = {
  card_purchase: ['amount', 'occurredAt', 'merchant', 'cardLast4', 'operationId'],
  online_purchase: ['amount', 'occurredAt', 'merchant', 'operationId'],
  atm_withdrawal: ['amount', 'occurredAt'],
  account_transfer: ['amount', 'occurredAt'],
  incoming_credit: ['amount', 'occurredAt'],
  service_payment: ['amount', 'occurredAt'],
  fee_commission: ['amount', 'occurredAt'],
};
const DEFAULT_REQUIRED = ['amount', 'occurredAt'];

function getMissingRequiredFields(parseResult) {
  if (!parseResult || !parseResult.success || !parseResult.transaction) {
    return ['parse_failed'];
  }
  const tx = parseResult.transaction;
  const required = REQUIRED_FIELDS[tx.template] || DEFAULT_REQUIRED;
  const missing = [];
  for (const field of required) {
    const value = tx[field];
    if (value === undefined || value === null || String(value).trim() === '') {
      missing.push(field);
    }
  }
  // La fecha jamás puede venir "inventada" del recibido del correo
  if (!missing.includes('occurredAt') && tx.notes && /datetime_fallback/i.test(tx.notes)) {
    missing.push('occurredAt');
  }
  const amountValue = tx.amount ? parseFloat(tx.amount.value) : NaN;
  if (!missing.includes('amount') && (!Number.isFinite(amountValue) || amountValue <= 0)) {
    missing.push('amount');
  }
  return missing;
}

/* Bandeja de revisión: registra el correo no procesable (idempotente). */
async function sendToReview({ userId, message, reason, rawBody }, deps = {}) {
  const prisma = deps.prisma || defaultPrisma;
  const review = {
    userId,
    messageId: message.id,
    subject: (message.subject || '').slice(0, 300),
    receivedAt: message.receivedDateTime ? new Date(message.receivedDateTime) : null,
    reason: reason.slice(0, 500),
    snippet: rawBody ? String(rawBody).slice(0, 500) : null,
  };
  try {
    await prisma.emailReview.upsert({
      where: { userId_messageId: { userId, messageId: message.id } },
      update: { reason: review.reason },
      create: review,
    });
  } catch (err) {
    console.error('❌ No se pudo registrar el correo en la bandeja de revisión:', err.message);
  }
  // Fallo RUIDOSO: log + notificación en tiempo real
  console.error(`🚨 Correo BCP NO procesable (${reason}). messageId=${message.id} subject="${review.subject}"`);
  if (deps.io) {
    deps.io.to(`user-${userId}`).emit('notification', {
      type: 'warning',
      title: '📥 Correo BCP no procesable',
      message: `Un correo del BCP no pudo convertirse en movimiento (${reason}). Quedó en la bandeja de revisión.`,
      priority: 'high',
      timestamp: new Date(),
    });
  }
}

/*
  Procesa un resultado de parser para un correo. Devuelve:
    { status: 'created', transaction }
    { status: 'duplicate', dedupKey: 'operation_number'|'message_id'|'dedupe_hash' }
    { status: 'review', reason }
*/
async function ingestParsedEmail({ userId, message, parseResult, rawBody }, deps = {}) {
  const prisma = deps.prisma || defaultPrisma;
  const getRules = deps.getRules || defaultGetRules;

  // ---- 1. Validación estricta (sin datos inventados) ----
  const missing = getMissingRequiredFields(parseResult);
  if (missing.length > 0) {
    const reason = missing[0] === 'parse_failed'
      ? `parser: ${((parseResult && parseResult.notes) || ['sin detalle']).join?.(', ') || 'formato no reconocido'}`
      : `faltan campos: ${missing.join(', ')}`;
    await sendToReview({ userId, message, reason, rawBody }, deps);
    return { status: 'review', reason };
  }

  const tx = parseResult.transaction;
  const amountValue = parseFloat(tx.amount.value);
  if (amountValue > MAX_ALLOWED_AMOUNT) {
    const reason = `monto fuera de rango: ${amountValue}`;
    await sendToReview({ userId, message, reason, rawBody }, deps);
    return { status: 'review', reason };
  }

  // ---- 2. Dedup nivel 1: número de operación del BCP (llave más fuerte) ----
  if (tx.operationId) {
    const byOperation = await prisma.transaction.findFirst({
      where: { userId, operationNumber: tx.operationId },
      select: { id: true },
    });
    if (byOperation) {
      return { status: 'duplicate', dedupKey: 'operation_number' };
    }
  }

  // ---- 2. Dedup nivel 2: messageId del proveedor ----
  const byMessage = await prisma.transaction.findFirst({
    where: { userId, messageId: message.id },
    select: { id: true },
  });
  if (byMessage) {
    return { status: 'duplicate', dedupKey: 'message_id' };
  }

  // ---- Construcción del movimiento (fecha = fecha de la TRANSACCIÓN) ----
  const data = createTransactionFromEmail(parseResult, userId, {
    id: message.id,
    subject: message.subject,
    receivedDateTime: message.receivedDateTime,
  });

  // Comercio: normalizado para clasificar, crudo para trazabilidad
  const merchantRaw = tx.merchant || null;
  const merchantNormalized = normalizeMerchant(merchantRaw);
  data.merchant = merchantNormalized || undefined;
  data.merchantRaw = merchantRaw || undefined;
  if (merchantNormalized) {
    data.description = `Pago en ${merchantNormalized}`;
  }

  // ---- 3. Clasificación por el motor de reglas (nunca se adivina) ----
  const rules = await getRules(userId);
  const { category, ruleId, matched } = classifyMovement(
    { description: data.description, merchant: merchantNormalized || '' },
    rules,
  );
  data.category = matched ? category : UNCLASSIFIED;
  data.ruleId = matched ? ruleId : null;
  data.isProcessed = matched;

  // ---- 2. Dedup nivel 3: hash (red de seguridad, cruza con PDF) ----
  const dedupeHash = buildDedupeHash({
    date: data.date,
    amount: data.amount,
    description: data.description,
    account: data.accountRef || '',
  });
  const byHash = await prisma.transaction.findFirst({
    where: { userId, dedupeHash },
    select: { id: true },
  });
  if (byHash) {
    return { status: 'duplicate', dedupKey: 'dedupe_hash' };
  }

  // ---- Persistencia ----
  delete data.accountRef; // no es columna de Transaction
  delete data.aiAnalysis; // parser determinístico: sin metadata de IA
  try {
    const created = await prisma.transaction.create({
      data: {
        ...data,
        messageId: message.id,
        rawText: rawBody ? String(rawBody).slice(0, 1000) : (message.subject || ''),
        origin: ORIGIN_EMAIL_BCP,
        dedupeHash,
      },
    });
    return { status: 'created', transaction: created };
  } catch (err) {
    // P2002 = índice único (operationNumber o messageId) ganó una carrera:
    // otro proceso insertó el mismo movimiento entre el chequeo y el create.
    if (err && err.code === 'P2002') {
      return { status: 'duplicate', dedupKey: 'db_unique' };
    }
    throw err;
  }
}

module.exports = {
  ingestParsedEmail,
  getMissingRequiredFields,
  sendToReview,
  ORIGIN_EMAIL_BCP,
};
