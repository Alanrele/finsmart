/*
  Cliente Prisma singleton para PostgreSQL.
  Reemplaza la conexión Mongoose; expone el estado de conexión que antes
  se consultaba con mongoose.connection.readyState.
*/
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error']
});

let connected = false;

/*
  Garantiza las columnas de membresía Platinum. Espeja la migración
  20260708210000_membresia_platinum (ambas usan IF NOT EXISTS): el flujo de
  desarrollo local arranca con nodemon sin pasar por `prisma migrate deploy`,
  así que el propio servidor asegura el esquema mínimo que necesita.
*/
const ensureMembershipColumns = async () => {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "es_platinum" BOOLEAN NOT NULL DEFAULT false'
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trial_usado" BOOLEAN NOT NULL DEFAULT false'
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trial_iniciado_en" TIMESTAMP(3)'
  );
};

/*
  Espeja la migración 20260709120000_parser_bcp_correos (parser BCP de
  correos): columna merchant_raw, tabla email_reviews e índice único parcial
  del número de operación. Todo idempotente.
*/
const ensureEmailParserSchema = async () => {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "merchant_raw" TEXT'
  );
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "email_reviews" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "messageId" TEXT NOT NULL,
      "subject" TEXT,
      "receivedAt" TIMESTAMP(3),
      "reason" TEXT NOT NULL,
      "snippet" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "email_reviews_pkey" PRIMARY KEY ("id")
    )`);
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS "email_reviews_userId_messageId_key" ON "email_reviews" ("userId", "messageId")'
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "email_reviews"
        ADD CONSTRAINT "email_reviews_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`);
  try {
    await prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX IF NOT EXISTS "transactions_userId_operationNumber_unique" ON "transactions" ("userId", "operationNumber") WHERE "operationNumber" IS NOT NULL'
    );
  } catch (err) {
    // Datos históricos con números de operación duplicados: el índice no se
    // puede crear. Se avisa RUIDOSAMENTE; el dedup por código sigue activo.
    console.error(
      '❌ No se pudo crear el índice único de operationNumber (¿duplicados históricos?):',
      err.message
    );
  }
};

const connectDb = async () => {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  await ensureMembershipColumns();
  await ensureEmailParserSchema();
  connected = true;
  return prisma;
};

const disconnectDb = async () => {
  connected = false;
  await prisma.$disconnect();
};

const isDbConnected = () => connected;

// Ping para el health check (devuelve latencia en ms)
const pingDb = async () => {
  const start = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  return Date.now() - start;
};

module.exports = { prisma, connectDb, disconnectDb, isDbConnected, pingDb };
