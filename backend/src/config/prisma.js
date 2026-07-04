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

const connectDb = async () => {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
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
