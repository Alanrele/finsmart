/**
 * @interface TransactionRepoPort
 * Contract describing persistence operations available to the application layer.
 */
class TransactionRepoPort {
  findByFilter() {
    throw new Error('TransactionRepoPort.findByFilter must be implemented');
  }

  findRecentForUser() {
    throw new Error('TransactionRepoPort.findRecentForUser must be implemented');
  }

  createOrUpdateFromEmail() {
    throw new Error('TransactionRepoPort.createOrUpdateFromEmail must be implemented');
  }

  deleteUserTransactions() {
    throw new Error('TransactionRepoPort.deleteUserTransactions must be implemented');
  }

  countByUser() {
    throw new Error('TransactionRepoPort.countByUser must be implemented');
  }
}

module.exports = TransactionRepoPort;
