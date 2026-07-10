/*
  Pruebas obligatorias del parser determinístico de correos BCP + ingesta:
  extracción de campos, fecha en español, normalización de comercio,
  correos no procesables (bandeja), dedup en 3 niveles (nro. de operación,
  messageId, cruce con PDF) y clasificación sin adivinar.
*/
const fixture = require('./fixtures/card_purchase_datos_operacion.json');
const { parseBcpEmailV2 } = require('../../../src/lib/email/bcp/parseBcpEmailV2');
const { normalizeMerchant } = require('../../../src/lib/email/normalizeMerchant');
const { buildDedupeHash } = require('../../../src/lib/classification/dedupeHash');
const { DEFAULT_RULES } = require('../../../src/lib/classification/rulesEngine');
const {
  ingestParsedEmail,
  getMissingRequiredFields,
  ORIGIN_EMAIL_BCP,
} = require('../../../src/services/emailIngest');

const USER_ID = 'user-test-1';

/* Prisma falso en memoria con las restricciones únicas relevantes */
function fakePrisma(initialTxs = []) {
  const txs = initialTxs.map((t, i) => ({ id: `seed-${i}`, ...t }));
  const reviews = [];
  return {
    _txs: txs,
    _reviews: reviews,
    transaction: {
      findFirst: async ({ where }) => {
        const match = txs.find((t) => {
          if (t.userId !== where.userId) return false;
          if (where.operationNumber !== undefined) return t.operationNumber === where.operationNumber;
          if (where.messageId !== undefined) return t.messageId === where.messageId;
          if (where.dedupeHash !== undefined) return t.dedupeHash === where.dedupeHash;
          return false;
        });
        return match || null;
      },
      create: async ({ data }) => {
        if (
          data.operationNumber &&
          txs.some((t) => t.userId === data.userId && t.operationNumber === data.operationNumber)
        ) {
          const err = new Error('Unique constraint failed');
          err.code = 'P2002';
          throw err;
        }
        if (txs.some((t) => t.messageId === data.messageId)) {
          const err = new Error('Unique constraint failed');
          err.code = 'P2002';
          throw err;
        }
        const row = { id: `tx-${txs.length + 1}`, ...data };
        txs.push(row);
        return row;
      },
    },
    emailReview: {
      upsert: async ({ create }) => {
        const existing = reviews.find(
          (r) => r.userId === create.userId && r.messageId === create.messageId,
        );
        if (existing) return existing;
        const row = { id: `rev-${reviews.length + 1}`, status: 'pending', ...create };
        reviews.push(row);
        return row;
      },
    },
  };
}

const rulesWithIds = DEFAULT_RULES.map((r, i) => ({ id: `rule-${i}`, enabled: true, ...r }));
const fakeGetRules = async () => rulesWithIds;

const parseFixture = (overrides = {}) =>
  parseBcpEmailV2({
    subject: fixture.subject,
    html: overrides.html || fixture.html,
    receivedAt: fixture.receivedAt,
  });

const message = (id = fixture.gmailMessageId) => ({
  id,
  subject: fixture.subject,
  receivedDateTime: fixture.receivedAt,
});

const ingest = (prisma, opts = {}) =>
  ingestParsedEmail(
    {
      userId: USER_ID,
      message: opts.message || message(),
      parseResult: opts.parseResult || parseFixture(),
      rawBody: 'cuerpo censurado',
    },
    { prisma, getRules: opts.getRules || fakeGetRules },
  );

describe('extracción de la plantilla "Datos de la operación"', () => {
  const result = parseFixture();
  const tx = result.transaction;

  test('extrae los 6 campos del correo real', () => {
    expect(result.success).toBe(true);
    expect(result.template).toBe('card_purchase'); // Operación realizada → consumo TC
    expect(tx.amount).toEqual({ value: '20.90', currency: 'PEN' }); // Total del consumo
    expect(tx.merchant).toBe('1048 MASS LIMA 11 BARR MS'); // Empresa (raw, intacta)
    expect(tx.cardLast4).toBe('1311'); // SOLO últimos 4
    expect(tx.operationId).toBe('0000816110'); // Número de operación
    expect(tx.occurredAt).toBeTruthy(); // Fecha y hora
  });

  test('fecha en español con AM/PM → ISO 8601 en America/Lima', () => {
    // "28 de junio de 2026 - 02:03 PM" → 14:03 hora de Lima (UTC-5)
    expect(tx.occurredAt).toBe('2026-06-28T14:03:00-05:00');
    const utc = new Date(tx.occurredAt);
    expect(utc.toISOString()).toBe('2026-06-28T19:03:00.000Z');
  });

  test('nunca conserva la cadena completa de asteriscos de la tarjeta', () => {
    expect(JSON.stringify(tx)).not.toContain('************1311');
  });
});

describe('normalización de comercio', () => {
  test('1048 MASS LIMA 11 BARR MS → MASS', () => {
    expect(normalizeMerchant('1048 MASS LIMA 11 BARR MS')).toBe('MASS');
  });

  test('quita código de tienda, ciudad y sufijos; conserva nombres compuestos', () => {
    expect(normalizeMerchant('00412 PLAZA VEA HUACHO HU')).toBe('PLAZA VEA');
    expect(normalizeMerchant('TAMBO 152 SURCO PE')).toBe('TAMBO');
    expect(normalizeMerchant('Panadería San José Barranca 03')).toBe('PANADERIA SAN JOSE');
  });

  test('no devuelve vacío ni inventa: sin entrada → null', () => {
    expect(normalizeMerchant(null)).toBeNull();
    expect(normalizeMerchant('   ')).toBeNull();
  });
});

describe('ingesta estricta (correo procesable)', () => {
  test('persiste el movimiento con los valores exactos de la verificación', async () => {
    const prisma = fakePrisma();
    const res = await ingest(prisma);

    expect(res.status).toBe('created');
    const t = res.transaction;
    expect(t.amount).toBe(20.9); // gasto de S/ 20.90
    expect(t.currency).toBe('PEN');
    expect(t.type).toBe('debit'); // consumo con TC = GASTO
    expect(t.merchant).toBe('MASS'); // comercio normalizado
    expect(t.merchantRaw).toBe('1048 MASS LIMA 11 BARR MS'); // trazabilidad
    expect(t.cardNumber).toBe('****1311');
    expect(t.operationNumber).toBe('0000816110');
    expect(t.origin).toBe(ORIGIN_EMAIL_BCP);
    expect(t.dedupeHash).toBeTruthy();
    // Asignación temporal: mes de la TRANSACCIÓN (junio), no del procesamiento
    expect(new Date(t.date).toISOString()).toBe('2026-06-28T19:03:00.000Z');
  });

  test('MASS clasifica por el motor de reglas (tiendas de conveniencia → food)', async () => {
    const prisma = fakePrisma();
    const res = await ingest(prisma);
    expect(res.transaction.category).toBe('food');
    expect(res.transaction.isProcessed).toBe(true);
  });

  test('comercio sin regla → Sin clasificar, nunca se adivina', async () => {
    const html = fixture.html.replace('1048 MASS LIMA 11 BARR MS', '9917 XZWQ COMERCIO IGNOTO');
    const prisma = fakePrisma();
    const res = await ingest(prisma, { parseResult: parseFixture({ html }) });
    expect(res.status).toBe('created');
    expect(res.transaction.category).toBe('unclassified');
    expect(res.transaction.isProcessed).toBe(false);
  });
});

describe('correo NO procesable → bandeja de revisión, cero inserciones', () => {
  test('sin "Fecha y hora" no se inserta nada y queda en revisión', async () => {
    const html = fixture.html.replace(/<tr><td>Fecha y hora[\s\S]*?<\/tr>/, '');
    const parseResult = parseFixture({ html });
    expect(getMissingRequiredFields(parseResult)).toContain('occurredAt');

    const prisma = fakePrisma();
    const res = await ingest(prisma, { parseResult });

    expect(res.status).toBe('review');
    expect(prisma._txs).toHaveLength(0); // NO se insertó nada
    expect(prisma._reviews).toHaveLength(1);
    expect(prisma._reviews[0].reason).toContain('occurredAt');
  });

  test('sin "Empresa" en un consumo → revisión, sin datos parciales', async () => {
    const html = fixture.html.replace(/<tr><td>Empresa[\s\S]*?<\/tr>/, '');
    const prisma = fakePrisma();
    const res = await ingest(prisma, { parseResult: parseFixture({ html }) });

    expect(res.status).toBe('review');
    expect(res.reason).toContain('merchant');
    expect(prisma._txs).toHaveLength(0);
    expect(prisma._reviews).toHaveLength(1);
  });
});

describe('anti-duplicados en 3 niveles', () => {
  test('mismo número de operación procesado dos veces → 1 solo movimiento', async () => {
    const prisma = fakePrisma();
    const first = await ingest(prisma);
    expect(first.status).toBe('created');

    // Segundo correo distinto (otro messageId) con el MISMO nro. de operación
    const second = await ingest(prisma, { message: message('OTRO-MSG-ID') });
    expect(second.status).toBe('duplicate');
    expect(second.dedupKey).toBe('operation_number');
    expect(prisma._txs).toHaveLength(1);
  });

  test('mismo gmail_message_id reprocesado → 1 solo movimiento', async () => {
    // Transacción previa SIN nro. de operación (para llegar al nivel 2)
    const prisma = fakePrisma([
      { userId: USER_ID, messageId: fixture.gmailMessageId, operationNumber: null, dedupeHash: 'x' },
    ]);
    const res = await ingest(prisma);
    expect(res.status).toBe('duplicate');
    expect(res.dedupKey).toBe('message_id');
    expect(prisma._txs).toHaveLength(1);
  });

  test('movimiento que entró por PDF + mismo por correo → 1 solo movimiento', async () => {
    // El PDF trajo el mismo número de operación → la llave fuerte los cruza
    const prisma = fakePrisma([
      {
        userId: USER_ID,
        messageId: 'pdf:user:hash-del-pdf',
        origin: 'pdf',
        operationNumber: '0000816110',
        dedupeHash: 'hash-pdf-distinto',
      },
    ]);
    const res = await ingest(prisma);
    expect(res.status).toBe('duplicate');
    expect(res.dedupKey).toBe('operation_number');
    expect(prisma._txs).toHaveLength(1);
  });

  test('nivel 3: misma huella (fecha+monto+descripcion+cuenta) → duplicado', async () => {
    const hash = buildDedupeHash({
      date: '2026-06-28T19:03:00.000Z',
      amount: 20.9,
      description: 'Pago en MASS',
      account: '',
    });
    const prisma = fakePrisma([
      { userId: USER_ID, messageId: 'otro-origen', operationNumber: null, dedupeHash: hash },
    ]);
    const res = await ingest(prisma);
    expect(res.status).toBe('duplicate');
    expect(res.dedupKey).toBe('dedupe_hash');
  });

  test('carrera contra el índice único de BD (P2002) → duplicado, no error', async () => {
    const prisma = fakePrisma();
    // findFirst "no ve" nada (simula carrera), pero create choca con el único
    prisma.transaction.findFirst = async () => null;
    await prisma.transaction.create({
      data: { userId: USER_ID, messageId: 'previo', operationNumber: '0000816110' },
    });
    const res = await ingest(prisma);
    expect(res.status).toBe('duplicate');
    expect(res.dedupKey).toBe('db_unique');
  });
});
