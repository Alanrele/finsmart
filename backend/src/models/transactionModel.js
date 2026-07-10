/*
  Modelo Transaction respaldado por Prisma/PostgreSQL.
  Mantiene la API Mongoose usada por rutas y servicios, incluidas las
  estáticas getMonthlySummary/getSpendingTrends y aggregate() para los
  pipelines de categoría que ejecutan financeRoutes y userService.
*/
const { buildDocumentClass, buildModel } = require('./compat');

const FIELDS = [
  'userId', 'messageId', 'amount', 'currency', 'type', 'category',
  'subcategory', 'merchant', 'merchantRaw', 'description', 'channel', 'operationNumber',
  'cardNumber', 'date', 'balance', 'location', 'rawText', 'isProcessed',
  'aiAnalysis', 'notes', 'reprocessCount', 'lastUpdated',
  'createdAt', 'updatedAt'
];

const TransactionDocument = buildDocumentClass({
  delegateName: 'transaction',
  fields: FIELDS
});

const Transaction = buildModel({
  delegateName: 'transaction',
  fields: FIELDS,
  DocumentClass: TransactionDocument
});

// Resumen mensual por categoría (misma salida que la estática de Mongoose)
Transaction.getMonthlySummary = function (userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  return this.aggregate([
    {
      $match: {
        userId: String(userId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ]);
};

// Tendencias de gasto por mes/categoría (misma salida que la estática de Mongoose)
Transaction.getSpendingTrends = function (userId, months = 6) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return this.aggregate([
    {
      $match: {
        userId: String(userId),
        date: { $gte: startDate },
        type: { $in: ['debit', 'payment', 'withdrawal'] }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          category: '$category'
        },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);
};

// Permite `new Transaction({...})` como con Mongoose
const TransactionModel = function (data) {
  return new TransactionDocument(data, { isNew: true });
};
Object.assign(TransactionModel, Transaction);

module.exports = TransactionModel;
