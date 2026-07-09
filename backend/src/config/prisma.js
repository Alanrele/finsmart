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

const connectDb = async () => {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  await ensureMembershipColumns();
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
