const User = require('../models/userModel');
const Transaction = require('../models/transactionModel');
const { Client } = require('@microsoft/microsoft-graph-client');
// const TransactionExtractor = require('./transactionExtractor'); // TODO: Create if needed
const GraphErrorHandler = require('../utils/graphErrorHandler');
const emailParserService = require('./emailParserService');
const { ingestParsedEmail, sendToReview, getMissingRequiredFields } = require('./emailIngest');

const BCP_ALLOWED_SENDERS = [
  'notificaciones@notificacionesbcp.com.pe',
  'notificaciones@bcp.com.pe',
  'alertas@bcp.com.pe',
  'movimientos@bcp.com.pe',
  'bcp@bcp.com.pe',
  'notificacionescrm@bcp.com.pe',
];
const BCP_HISTORICAL_START = new Date(Date.UTC(2025, 0, 1));

class EmailSyncService {
  constructor(io) {
    this.io = io;
    this.syncInterval = null;
    this.isRunning = false;
  }

  // Custom authentication provider
  getGraphClient(accessToken) {
    class CustomAuthProvider {
      constructor(token) {
        this.accessToken = token;
      }
      async getAccessToken() {
        return this.accessToken;
      }
    }

    const authProvider = new CustomAuthProvider(accessToken);
    return Client.initWithMiddleware({ authProvider });
  }

  // Start periodic sync for all users
  startPeriodicSync(intervalMinutes = 15) {
    if (this.isRunning) {
      console.log('📧 Email sync already running');
      return;
    }

    console.log(`📧 Starting periodic email sync every ${intervalMinutes} minutes`);
    this.isRunning = true;

    // Initial sync
    this.syncAllUsers();

    // Set up interval
    this.syncInterval = setInterval(() => {
      this.syncAllUsers();
    }, intervalMinutes * 60 * 1000);
  }

  // Stop periodic sync
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.isRunning = false;
      console.log('📧 Periodic email sync stopped');
    }
  }

  // Sync emails for all users with active sync
  async syncAllUsers() {
    try {
      console.log('📧 Starting periodic sync for all users...');

      // Find all users with sync enabled and valid tokens
      const users = await User.find({
        syncEnabled: true,
        accessToken: { $exists: true, $ne: null },
        tokenExpiry: { $gt: new Date() }
      });

      console.log(`📧 Found ${users.length} users to sync`);

      for (const user of users) {
        try {
          await this.syncUserEmails(user);
          // Add small delay between users to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`❌ Error syncing user ${user.email}:`, error);

          // If token expired, disable sync for this user
          if (error.code === 'InvalidAuthenticationToken') {
            user.syncEnabled = false;
            await user.save();
            console.log(`🔒 Disabled sync for user ${user.email} due to expired token`);
          }
        }
      }

      console.log('✅ Periodic sync completed');
    } catch (error) {
      console.error('❌ Error in periodic sync:', error);
    }
  }

  // Sync emails for a specific user
  async syncUserEmails(user) {
    try {
      console.log(`📧 Syncing emails for user: ${user.email}`);

      const graphClient = this.getGraphClient(user.accessToken);

      const hasExistingTransactions = await Transaction.exists({ userId: user._id });
      const regularLookbackHours = Number(process.env.SYNC_LOOKBACK_HOURS || 24);
      const initialLookbackHours = Number(process.env.SYNC_INITIAL_LOOKBACK_HOURS || (24 * 30));
      const bufferHours = Number(process.env.SYNC_LOOKBACK_BUFFER_HOURS || 6);

      const lookbackHours = hasExistingTransactions ? regularLookbackHours : initialLookbackHours;
      const lookbackDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
      const lastSyncDate = user.lastSync ? new Date(user.lastSync) : null;
      const bufferMs = bufferHours * 60 * 60 * 1000;

      let effectiveStartDate = lookbackDate;
      if (lastSyncDate && lastSyncDate < effectiveStartDate) {
        effectiveStartDate = new Date(Math.max(lastSyncDate.getTime() - bufferMs, BCP_HISTORICAL_START.getTime()));
      } else if (effectiveStartDate < BCP_HISTORICAL_START) {
        effectiveStartDate = new Date(BCP_HISTORICAL_START);
      }

      const lookbackIso = effectiveStartDate.toISOString();

      console.log(`🕒 Using ${lookbackHours}h lookback window (effective start ${lookbackIso}) for ${hasExistingTransactions ? 'incremental' : 'initial'} sync`);

      const allowedSenders = BCP_ALLOWED_SENDERS;
      const bcpFilters = allowedSenders.map(a => `from/emailAddress/address eq '${a}'`);

      let messages;

      // Define query strategies from most specific to least specific
      const primaryQuery = async () => {
        const filter = `(${bcpFilters.join(' or ')}) and receivedDateTime ge ${lookbackIso}`;
        console.log('🔍 Executing complex query with multiple filters...');
        return await graphClient
          .api('/me/messages')
          .filter(filter)
          .select('id,subject,body,receivedDateTime,from,hasAttachments')
          .orderby('receivedDateTime desc')
          .top(150)
          .get();
      };

      const fallbackQueries = [
        // Fallback 1: Simplified date-only filter
        async () => {
          console.log('🔍 Executing simplified query with date filter only...');
          const result = await graphClient
            .api('/me/messages')
            .filter(`receivedDateTime ge ${lookbackIso}`)
            .select('id,subject,body,receivedDateTime,from,hasAttachments')
            .orderby('receivedDateTime desc')
            .top(100)
            .get();

          // Filter BCP emails manually by strict whitelist
          if (result.value) {
            result.value = result.value.filter(msg => {
              const fromAddress = msg.from?.emailAddress?.address?.toLowerCase() || '';
              return allowedSenders.includes(fromAddress);
            });
            console.log(`📧 Manually filtered to ${result.value.length} BCP emails`);
          }
          return result;
        },

        // Fallback 2: Minimal query without date filter
        async () => {
          console.log('🔍 Executing minimal query without date filter...');
          const result = await graphClient
            .api('/me/messages')
            .select('id,subject,body,receivedDateTime,from,hasAttachments')
            .orderby('receivedDateTime desc')
            .top(50)
            .get();

          // Filter both by date and BCP manually (strict whitelist)
          if (result.value) {
            result.value = result.value.filter(msg => {
              const fromAddress = msg.from?.emailAddress?.address?.toLowerCase() || '';
              const receivedDate = new Date(msg.receivedDateTime);
              const isBcp = allowedSenders.includes(fromAddress);
              const isRecent = receivedDate >= effectiveStartDate;
              return isBcp && isRecent;
            });
            console.log(`📧 Manually filtered to ${result.value.length} recent BCP emails`);
          }
          return result;
        },

        // Fallback 3: Absolute minimal query
        async () => {
          console.log('🔍 Executing absolute minimal query...');
          const result = await graphClient
            .api('/me/messages')
            .top(25)
            .get();

          // Filter everything manually (strict whitelist)
          if (result.value) {
            result.value = result.value.filter(msg => {
              const fromAddress = msg.from?.emailAddress?.address?.toLowerCase() || '';
              const receivedDate = new Date(msg.receivedDateTime);
              const isBcp = allowedSenders.includes(fromAddress);
              const isRecent = receivedDate >= effectiveStartDate;
              return isBcp && isRecent;
            });
            console.log(`📧 Manually filtered to ${result.value.length} recent BCP emails from minimal set`);
          }
          return result;
        }
      ];

      // Execute query with automatic fallback handling
      messages = await GraphErrorHandler.executeWithFallback(primaryQuery, fallbackQueries);

      console.log(`📨 Found ${messages.value.length} recent emails for ${user.email}`);

      let newTransactionsCount = 0;

      for (const message of messages.value) {
        // Check if message already processed
        const existingTransaction = await Transaction.findOne({
          messageId: message.id,
          userId: user._id
        });

        if (existingTransaction) {
          continue; // Skip already processed
        }

        // Early gate: subject/bodyPreview transactional check to avoid heavy work
        const subj = message.subject || '';
        const bodyPreview = message.bodyPreview || '';
        const sender = message.from?.emailAddress?.address || '';

        if (!emailParserService.isTransactionalEmail(subj, bodyPreview, { from: sender })) {
          continue;
        }

        let htmlBody;
        let emailText = '';

        // Extract content (defensive: body may be missing in some fallbacks)
        if (message.body && message.body.content) {
          const contentType = (message.body.contentType || '').toLowerCase();
          if (contentType === 'html') {
            htmlBody = message.body.content;
          } else {
            emailText = message.body.content;
          }
        } else if (message.bodyPreview) {
          emailText = message.bodyPreview;
        } else {
          emailText = subj;
        }

        // Parse email content
        const parseResult = emailParserService.parseEmailContent({
          subject: subj,
          html: htmlBody,
          text: emailText,
          receivedAt: message.receivedDateTime,
        });

        // Double-check transactional nature with full content
        if (!emailParserService.isTransactionalEmail(subj, emailText || htmlBody || '', { from: sender })) {
          continue;
        }

        // Ingesta estricta: valida etiquetas requeridas (o bandeja de
        // revisión), deduplica en 3 niveles y clasifica con el motor de reglas
        const ingest = await ingestParsedEmail(
          {
            userId: user._id,
            message: {
              id: message.id,
              subject: message.subject,
              receivedDateTime: message.receivedDateTime,
            },
            parseResult,
            rawBody: emailText || htmlBody || message.subject || '',
          },
          { io: this.io },
        );

        if (ingest.status === 'duplicate') {
          console.log(`⚠️ Duplicado (${ingest.dedupKey}) para messageId=${message.id}`);
          continue;
        }
        if (ingest.status === 'review') {
          continue; // ya quedó en la bandeja, con log y notificación
        }

        const transaction = ingest.transaction;
        newTransactionsCount++;

        console.log(`✅ New transaction created for ${user.email}:`, {
          amount: transaction.amount,
          type: transaction.type,
          description: transaction.description
        });

        // Emit real-time update
        if (this.io) {
          this.io.to(`user-${user._id}`).emit('new-transaction', {
            ...transaction,
            isNew: true,
            fromSync: true
          });

          this.io.to(`user-${user._id}`).emit('notification', {
            type: 'success',
            title: '💳 Nueva Transacción Detectada',
            message: `${transaction.type}: S/ ${transaction.amount.toFixed(2)} - ${transaction.description}`,
            priority: 'high',
            timestamp: new Date(),
            fromSync: true
          });
        }
      }

      // Update last sync time
      user.lastSync = new Date();
      await user.save();

      if (newTransactionsCount > 0) {
        console.log(`✅ Sync completed for ${user.email}: ${newTransactionsCount} new transactions`);
      }

      return newTransactionsCount;

    } catch (error) {
      GraphErrorHandler.logError(error, `syncUserEmails for ${user.email}`);

      const errorInfo = GraphErrorHandler.formatErrorForUser(error);
      console.log(`📊 Error category: ${errorInfo.type} - ${errorInfo.message}`);

      // Handle authentication errors by disabling sync
      if (GraphErrorHandler.isAuthError(error)) {
        console.log(`🔒 Disabling sync for user ${user.email} due to authentication error`);
        user.syncEnabled = false;
        await user.save();
      }

      throw error;
    }
  }

  // Manual sync for a specific user (called from API)
  async manualSyncUser(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.accessToken) {
        throw new Error('Microsoft account not connected');
      }

      return await this.syncUserEmails(user);
    } catch (error) {
      console.error('❌ Manual sync error:', error);
      throw error;
    }
  }

  // Check sync status
  getSyncStatus() {
    return {
      isRunning: this.isRunning,
      interval: this.syncInterval ? 'Active' : 'Inactive'
    };
  }

  // Reprocess all past emails for a user to update with new information
  async reprocessAllEmails(userId, options = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.accessToken) {
        throw new Error('Microsoft account not connected');
      }

      console.log(`🔄 Starting comprehensive reprocessing of ALL emails for user: ${user.email}`);

      const graphClient = this.getGraphClient(user.accessToken);

      // Get ALL BCP emails from the past (not just recent ones)
      // We'll search back up to 1 year to cover all historical emails
      const historicalStartIso = BCP_HISTORICAL_START.toISOString();

      const bcpFilters = [
        "from/emailAddress/address eq 'notificaciones@notificacionesbcp.com.pe'"
      ];

      let allEmails = [];
      let skipToken = null;
      const pageSize = 100; // Increased from 50 to fetch more emails per page

      // Fetch all historical BCP emails with pagination
      do {
        try {
          const query = graphClient
            .api('/me/messages')
            .filter(`receivedDateTime ge ${historicalStartIso}`)
            .select('id,subject,body,receivedDateTime,from,hasAttachments')
            .orderby('receivedDateTime desc')
            .top(pageSize);

          if (skipToken) {
            query.skipToken(skipToken);
          }

          const response = await query.get();

          if (response.value && response.value.length > 0) {
            // Filter BCP emails client-side to avoid complex Graph queries
            const bcpEmails = response.value.filter((message) => {
              const fromAddress = message.from?.emailAddress?.address?.toLowerCase();
              return fromAddress && BCP_ALLOWED_SENDERS.includes(fromAddress);
            });

            allEmails = allEmails.concat(bcpEmails);
            console.log(`📨 Fetched ${response.value.length} emails, ${bcpEmails.length} BCP emails (total BCP: ${allEmails.length})`);
          }

          skipToken = response['@odata.nextLink'] ? new URL(response['@odata.nextLink']).searchParams.get('$skipToken') : null;

        } catch (error) {
          console.error('❌ Error fetching email page:', error);
          break; // Stop pagination on error
        }
      } while (skipToken && allEmails.length < 3000); // Limit to 3000 emails max

      console.log(`📨 Found ${allEmails.length} total BCP emails for reprocessing`);

      let processedCount = 0;
      let updatedCount = 0;
      let newCount = 0;
      let errorCount = 0;
      let skippedCount = 0;

      // Process emails in batches to avoid rate limiting
      const batchSize = options.batchSize || 10;
      for (let i = 0; i < allEmails.length; i += batchSize) {
        const batch = allEmails.slice(i, i + batchSize);
        console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allEmails.length/batchSize)} (${batch.length} emails)`);

        for (const message of batch) {
          try {
            processedCount++;

            // Check if message already processed
            const existingTransaction = await Transaction.findOne({
              messageId: message.id,
              userId: user._id
            });

            let htmlBody;
            let textBody = '';

            // Extract content
            if (message.body.contentType === 'html') {
              htmlBody = message.body.content;
            } else {
              textBody = message.body.content;
            }

            if (!htmlBody && !textBody) {
              textBody = message.bodyPreview || message.subject || '';
            }

            // Parse email content
            const parseResult = emailParserService.parseEmailContent({
              subject: message.subject || '',
              html: htmlBody,
              text: textBody,
              receivedAt: message.receivedDateTime,
            });

            const normalizedTx = parseResult && parseResult.transaction;
            const missingFields = getMissingRequiredFields(parseResult);

            if (missingFields.length === 0) {
              // Create transaction data
              const transactionData = emailParserService.createTransactionFromEmail(
                parseResult,
                user._id,
                {
                  id: message.id,
                  subject: message.subject,
                  receivedDateTime: message.receivedDateTime
                }
              );

              if (existingTransaction) {
                // Check if there are meaningful changes
                const hasChanges = this.hasMeaningfulChanges(existingTransaction, transactionData, normalizedTx);

                if (hasChanges) {
                  // Update the existing transaction
                  existingTransaction.amount = transactionData.amount;
                  existingTransaction.type = transactionData.type;
                  // La categoría NO se pisa en reprocesos: la decide el motor
                  // de reglas o el usuario, nunca un mapa por plantilla.
                  existingTransaction.description = transactionData.description;
                  existingTransaction.merchant = transactionData.merchant;
                  existingTransaction.location = transactionData.location;
                  existingTransaction.rawText = (textBody || htmlBody || message.subject || '').substring(0, 1000);
                  existingTransaction.lastUpdated = new Date();
                  existingTransaction.reprocessCount = (existingTransaction.reprocessCount || 0) + 1;

                  await existingTransaction.save();
                  updatedCount++;

                  console.log(`✅ Updated transaction ${existingTransaction._id}:`, {
                    oldAmount: existingTransaction.amount,
                    newAmount: transactionData.amount,
                    type: existingTransaction.type,
                    description: existingTransaction.description
                  });

                  // Emit real-time update
                  if (this.io) {
                    this.io.to(`user-${user._id}`).emit('transaction-updated', {
                      ...existingTransaction.toObject(),
                      fromReprocess: true
                    });
                  }
                } else {
                  console.log(`⏭️ No changes needed for existing transaction ${existingTransaction._id}`);
                  skippedCount++;
                }
              } else {
                // Ingesta estricta unificada (dedup 3 niveles + clasificación)
                const ingest = await ingestParsedEmail(
                  {
                    userId: user._id,
                    message: {
                      id: message.id,
                      subject: message.subject,
                      receivedDateTime: message.receivedDateTime,
                    },
                    parseResult,
                    rawBody: textBody || htmlBody || message.subject || '',
                  },
                  { io: this.io },
                );

                if (ingest.status === 'duplicate') {
                  skippedCount++;
                } else if (ingest.status === 'review') {
                  errorCount++;
                } else {
                  const transaction = ingest.transaction;
                  newCount++;

                  console.log(`🆕 New transaction created from historical email:`, {
                    amount: transaction.amount,
                    type: transaction.type,
                    description: transaction.description,
                    subject: (message.subject || '').substring(0, 50)
                  });

                  // Emit real-time update
                  if (this.io) {
                    this.io.to(`user-${user._id}`).emit('new-transaction', {
                      ...transaction,
                      isNew: true,
                      fromReprocess: true
                    });

                    this.io.to(`user-${user._id}`).emit('notification', {
                      type: 'success',
                      title: '💳 Transacción Histórica Encontrada',
                      message: `${transaction.type}: S/ ${transaction.amount.toFixed(2)} - ${transaction.description}`,
                      priority: 'medium',
                      timestamp: new Date(),
                      fromReprocess: true
                    });
                  }
                }
              }
            } else if (existingTransaction) {
              // Ya existe y el correo dejó de ser parseable: no se toca nada
              skippedCount++;
            } else {
              // Correo no procesable: bandeja de revisión, sin inventar datos
              await sendToReview(
                {
                  userId: user._id,
                  message: {
                    id: message.id,
                    subject: message.subject,
                    receivedDateTime: message.receivedDateTime,
                  },
                  reason: missingFields[0] === 'parse_failed'
                    ? 'parser: formato no reconocido'
                    : `faltan campos: ${missingFields.join(', ')}`,
                  rawBody: textBody || htmlBody || '',
                },
                { io: this.io },
              );
              errorCount++;
            }

          } catch (error) {
            console.error(`❌ Error reprocessing email ${message.id}:`, error);
            errorCount++;
          }
        }

        // Small delay between batches
        if (i + batchSize < allEmails.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Update user's last reprocess time
      user.lastReprocess = new Date();
      await user.save();

      const result = {
        totalEmails: allEmails.length,
        processed: processedCount,
        updated: updatedCount,
        new: newCount,
        errors: errorCount,
        skipped: skippedCount,
        success: true
      };

      console.log(`✅ Comprehensive reprocessing completed for ${user.email}:`, result);

      // Emit completion notification
      if (this.io) {
        this.io.to(`user-${user._id}`).emit('reprocess-completed', result);
      }

      return result;

    } catch (error) {
      console.error('❌ Error in reprocessAllEmails:', error);
      throw error;
    }
  }

  // Helper function to check if reprocessing resulted in meaningful changes
  hasMeaningfulChanges(existingTransaction, newData, newParsedData) {
    // Check for significant changes
    const amountChanged = Math.abs(existingTransaction.amount - newData.amount) > 0.01;
    const typeChanged = existingTransaction.type !== newData.type;
    const categoryChanged = existingTransaction.category !== newData.category;
    const merchantChanged = existingTransaction.merchant !== newData.merchant;
    const descriptionChanged = existingTransaction.description !== newData.description;

    // Consider it a meaningful change if any key field changed
    return amountChanged || typeChanged || categoryChanged || merchantChanged || descriptionChanged;
  }
}

module.exports = EmailSyncService;
