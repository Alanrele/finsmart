const Transaction = require('./models/transactionModel');

class TransactionRepo {
  async findByFilter(filter, options = {}) {
    const query = Transaction.find(filter);

    if (options.sort) {
      query.sort(options.sort);
    }

    if (options.limit) {
      query.limit(options.limit);
    }

    if (options.select) {
      query.select(options.select);
    }

    return query.exec();
  }

  async findRecentForUser(userId, limit = 20) {
    return Transaction.find({ userId })
      .sort({ date: -1 })
      .limit(limit)
      .exec();
  }

  async createOrUpdateFromEmail(criteria, updates) {
    return Transaction.findOneAndUpdate(criteria, updates, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }).exec();
  }

  async deleteUserTransactions(userId) {
    return Transaction.deleteMany({ userId }).exec();
  }

  async countByUser(userId) {
    return Transaction.countDocuments({ userId }).exec();
  }
}

module.exports = new TransactionRepo();
module.exports.TransactionRepo = TransactionRepo;
