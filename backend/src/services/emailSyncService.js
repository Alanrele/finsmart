const User = require('../models/userModel');
const Transaction = require('../models/transactionModel');
const mongoose = require('mongoose');
const { Client } = require('@microsoft/microsoft-graph-client');
// const TransactionExtractor = require('./transactionExtractor'); // TODO: Create if needed
const GraphErrorHandler = require('../utils/graphErrorHandler');
const emailParserService = require('./emailParserService');
const azureOcrService = require('./azureOcrService');

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

      // Get recent emails (last 24 hours for periodic sync)
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const bcpFilters = [
        "from/emailAddress/address eq 'notificaciones@bcp.com.pe'",
        "from/emailAddress/address eq 'bcp@bcp.com.pe'",
        "from/emailAddress/address eq 'alertas@bcp.com.pe'",
        "from/emailAddress/address eq 'movimientos@bcp.com.pe'"
      ];

      let messages;

      // Define query strategies from most specific to least specific
      const primaryQuery = async () => {
        const filter = `(${bcpFilters.join(' or ')}) and receivedDateTime ge ${last24Hours}`;
        console.log('🔍 Executing complex query with multiple filters...');
        return await graphClient
          .api('/me/messages')
          .filter(filter)
          .select('id,subject,body,receivedDateTime,from,hasAttachments')
          .orderby('receivedDateTime desc')
          .top(50)
          .get();
      };

      const fallbackQueries = [
        // Fallback 1: Simplified date-only filter
        async () => {
          console.log('🔍 Executing simplified query with date filter only...');
          const result = await graphClient
            .api('/me/messages')
            .filter(`receivedDateTime ge ${last24Hours}`)
            .select('id,subject,body,receivedDateTime,from,hasAttachments')
            .orderby('receivedDateTime desc')
            .top(20)
            .get();

          // Filter BCP emails manually
          if (result.value) {
            const bcpDomains = ['@bcp.com.pe'];
            result.value = result.value.filter(msg => {
              const fromAddress = msg.from?.emailAddress?.address?.toLowerCase() || '';
              return bcpDomains.some(domain => fromAddress.includes(domain));
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
            .top(10)
            .get();

          // Filter both by date and BCP manually
          if (result.value) {
            const last24HoursDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const bcpDomains = ['@bcp.com.pe'];

            result.value = result.value.filter(msg => {
              const fromAddress = msg.from?.emailAddress?.address?.toLowerCase() || '';
              const receivedDate = new Date(msg.receivedDateTime);
              const isBcp = bcpDomains.some(domain => fromAddress.includes(domain));
              const isRecent = receivedDate >= last24HoursDate;
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
            .top(5)
            .get();

          // Filter everything manually
          if (result.value) {
            const last24HoursDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const bcpDomains = ['@bcp.com.pe'];

            result.value = result.value.filter(msg => {
              const fromAddress = msg.from?.emailAddress?.address?.toLowerCase() || '';
              const receivedDate = new Date(msg.receivedDateTime);
              const isBcp = bcpDomains.some(domain => fromAddress.includes(domain));
              const isRecent = receivedDate >= last24HoursDate;
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

        let emailContent = '';

        // Extract content
        if (message.body.contentType === 'html') {
          emailContent = message.body.content;
        } else {
          emailContent = message.body.content;
        }

        // Process attachments if any
        if (message.hasAttachments) {
          try {
            const attachments = await graphClient
              .api(`/me/messages/${message.id}/attachments`)
              .get();

            for (const attachment of attachments.value) {
              if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                const ocrText = await azureOcrService.extractTextFromImage(attachment.contentBytes);
                emailContent += '\n\nOCR Content:\n' + ocrText;
              }
            }
          } catch (attachmentError) {
            console.error('❌ Error processing attachments:', attachmentError);
          }
        }

        // Parse email content
        const parsedData = emailParserService.parseEmailContent(emailContent);

        if (parsedData && parsedData.amount && parsedData.amount > 0) {
          // Create transaction
          const transactionData = emailParserService.createTransactionFromEmail(
            parsedData,
            user._id,
            {
              id: message.id,
              subject: message.subject,
              receivedDateTime: message.receivedDateTime
            }
          );

          const transaction = new Transaction({
            ...transactionData,
            messageId: message.id,
            rawText: emailContent.substring(0, 1000),
            isProcessed: true,
            createdAt: new Date(message.receivedDateTime)
          });

          await transaction.save();
          newTransactionsCount++;

          console.log(`✅ New transaction created for ${user.email}:`, {
            amount: transaction.amount,
            type: transaction.type,
            description: transaction.description
          });

          // Emit real-time update
          if (this.io) {
            this.io.to(`user-${user._id}`).emit('new-transaction', {
              ...transaction.toObject(),
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
}

module.exports = EmailSyncService;
