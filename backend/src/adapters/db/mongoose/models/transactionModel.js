const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messageId: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'PEN'
  },
  type: {
    type: String,
    enum: ['debit', 'credit', 'transfer', 'payment', 'withdrawal', 'deposit'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'food', 'transport', 'entertainment', 'shopping', 'healthcare',
      'utilities', 'education', 'travel', 'investment', 'income',
      'transfer', 'other'
    ],
    default: 'other'
  },
  subcategory: {
    type: String
  },
  merchant: {
    type: String
  },
  description: {
    type: String,
    required: true
  },
  channel: {
    type: String,
    enum: ['online', 'atm', 'pos', 'mobile', 'branch', 'other'],
    default: 'other'
  },
  operationNumber: {
    type: String
  },
  cardNumber: {
    type: String
  },
  date: {
    type: Date,
    required: true
  },
  balance: {
    type: Number
  },
  location: {
    type: String
  },
  rawText: {
    type: String,
    required: true
  },
  isProcessed: {
    type: Boolean,
    default: false
  },
  aiAnalysis: {
    confidence: Number,
    insights: [String],
    recommendations: [String]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1 });
transactionSchema.index({ userId: 1, type: 1 });

// Update timestamp on save
transactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get user's monthly summary
transactionSchema.statics.getMonthlySummary = function(userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
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

// Static method to get spending trends
transactionSchema.statics.getSpendingTrends = function(userId, months = 6) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
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

module.exports = mongoose.model('Transaction', transactionSchema);
