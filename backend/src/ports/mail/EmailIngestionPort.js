/**
 * @interface EmailIngestionPort
 * Contract for services that retrieve and normalize email data into domain transactions.
 */
class EmailIngestionPort {
  startPeriodicSync() {
    throw new Error('EmailIngestionPort.startPeriodicSync must be implemented');
  }

  stopPeriodicSync() {
    throw new Error('EmailIngestionPort.stopPeriodicSync must be implemented');
  }

  syncUserEmails() {
    throw new Error('EmailIngestionPort.syncUserEmails must be implemented');
  }

  reprocessAllEmails() {
    throw new Error('EmailIngestionPort.reprocessAllEmails must be implemented');
  }
}

module.exports = EmailIngestionPort;
