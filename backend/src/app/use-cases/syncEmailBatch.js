const EmailIngestionPort = require('../../ports/mail/EmailIngestionPort');

/**
 * Factory that exposes high-level email synchronization use cases.
 * @param {Object} deps
 * @param {EmailIngestionPort} deps.emailIngestion
 */
function createEmailSyncUseCases({ emailIngestion }) {
  if (!emailIngestion || !(emailIngestion instanceof EmailIngestionPort || typeof emailIngestion.syncUserEmails === 'function')) {
    throw new Error('createEmailSyncUseCases requires a valid emailIngestion implementing EmailIngestionPort');
  }

  return {
    start: (intervalMinutes) => emailIngestion.startPeriodicSync(intervalMinutes),
    stop: () => emailIngestion.stopPeriodicSync(),
    syncUser: (user) => emailIngestion.syncUserEmails(user),
    reprocessAll: (userId, options) => emailIngestion.reprocessAllEmails(userId, options),
    syncAll: () => emailIngestion.syncAllUsers(),
  };
}

module.exports = createEmailSyncUseCases;
