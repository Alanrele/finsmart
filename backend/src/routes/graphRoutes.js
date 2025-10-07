const express = require('express');
const { Client } = require('@microsoft/microsoft-graph-client');
const { AuthenticationProvider } = require('@microsoft/microsoft-graph-client');
const { body, validationResult } = require('express-validator');
const User = require('../models/userModel');
const Transaction = require('../models/transactionModel');
const azureOcrService = require('../services/azureOcrService');
const aiAnalysisService = require('../services/aiAnalysisService');
const emailParserService = require('../services/emailParserService');

const router = express.Router();

// Custom authentication provider for Microsoft Graph
class CustomAuthProvider {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }

  async getAccessToken() {
    return this.accessToken;
  }
}

// Get Graph client for user
const getGraphClient = (accessToken) => {
  const authProvider = new CustomAuthProvider(accessToken);
  return Client.initWithMiddleware({ authProvider });
};

// Connect to Microsoft Account
router.post('/connect', async (req, res) => {
  try {
    const { accessToken, refreshToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    // Update user with tokens
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        accessToken,
        refreshToken,
        tokenExpiry: new Date(Date.now() + 3600000), // 1 hour
        lastSync: new Date()
      },
      { new: true }
    );

    // Test the connection by getting user profile
    try {
      const graphClient = getGraphClient(accessToken);
      const profile = await graphClient.api('/me').get();

      res.json({
        message: 'Microsoft Graph connected successfully',
        profile: {
          displayName: profile.displayName,
          email: profile.mail || profile.userPrincipalName
        }
      });
    } catch (graphError) {
      console.error('Graph API test failed:', graphError);
      res.status(400).json({
        error: 'Failed to connect to Microsoft Graph',
        details: 'Please check your access token'
      });
    }

  } catch (error) {
    console.error('Connect error:', error);
    res.status(500).json({ error: 'Failed to connect Microsoft account' });
  }
});

// Sync emails from BCP
router.post('/sync-emails', async (req, res) => {
  try {
    console.log('🔄 Starting email sync process...');
    console.log('👤 Request user:', req.user);

    const userId = req.user._id;

    // Only block demo users, allow real Microsoft users
    if (userId === 'demo-user-id') {
      console.log('❌ Demo user blocked from sync');
      return res.status(400).json({
        error: 'Real Microsoft Graph connection required',
        details: 'Please connect with a real Microsoft account to sync emails'
      });
    }

    console.log('🔍 Looking up user in database with ID:', userId);
    const user = await User.findById(userId);

    if (!user) {
      console.log('❌ User not found in database:', userId);
      return res.status(404).json({
        error: 'User not found',
        details: 'Please ensure you are properly authenticated'
      });
    }

    console.log('✅ User found:', { email: user.email, hasToken: !!user.accessToken });

    if (!user.accessToken) {
      console.log('❌ User has no access token');
      return res.status(400).json({
        error: 'Microsoft account not connected',
        details: 'Please connect your Microsoft account first'
      });
    }

    console.log('🔗 Creating Graph client...');
    const graphClient = getGraphClient(user.accessToken);

    // Define BCP email domains for filtering
    const bcpDomains = ['bcp.com.pe'];

    // Ultra-simplified approach: Get recent emails with minimal query complexity
    const select = 'id,subject,body,receivedDateTime,from,hasAttachments';
    const top = 50; // Reduced to avoid complexity issues

    console.log('📧 Fetching recent emails with minimal complexity query');

    let messages;
    try {
      // First attempt: Try with basic query
      messages = await graphClient
        .api('/me/messages')
        .select(select)
        .top(top)
        .get();
    } catch (graphError) {
      if (graphError.code === 'InefficientFilter') {
        console.log('⚠️ First attempt failed, trying with even simpler query...');
        // Fallback: Ultra-minimal query
        try {
          messages = await graphClient
            .api('/me/messages')
            .select('id,subject,receivedDateTime,from')
            .top(20)
            .get();

          console.log('✅ Fallback query successful, but with limited data');
        } catch (fallbackError) {
          console.error('❌ Even fallback query failed:', fallbackError);
          throw fallbackError;
        }
      } else {
        throw graphError;
      }
    }

    console.log(`📨 Retrieved ${messages.value.length} total emails, filtering for BCP emails`);

    // Filter BCP emails in memory
    const bcpEmails = messages.value.filter(message => {
      const fromEmail = message.from?.emailAddress?.address?.toLowerCase() || '';
      return bcpDomains.some(domain => fromEmail.includes(domain));
    });

    console.log(`🏦 Found ${bcpEmails.length} emails from BCP domains`);

    const messages_filtered = { value: bcpEmails };

    console.log(`📨 Found ${messages.value.length} emails from BCP`);

    const processedTransactions = [];
    const skippedEmails = [];
    const io = req.app.get('io');
    let newTransactionsCount = 0;

    for (const message of messages_filtered.value) {
      try {
        // Check if message already processed
        const existingTransaction = await Transaction.findOne({
          messageId: message.id,
          userId: user._id
        });

        if (existingTransaction) {
          console.log(`⏭️ Skipping already processed email: ${message.subject}`);
          continue;
        }

        // Quick check if email is likely transactional before processing
        // Handle case where body might be missing from fallback query
        const emailBodyContent = message.body?.content || '';
        const isLikelyTransactional = emailParserService.isTransactionalEmail(
          message.subject,
          emailBodyContent
        );

        if (!isLikelyTransactional) {
          console.log(`📧 Skipping promotional email: ${message.subject}`);
          skippedEmails.push({
            subject: message.subject,
            reason: 'Promotional email - no transaction data expected'
          });
          continue;
        }

        console.log(`💳 Processing potential transaction email: ${message.subject}`);

        let emailContent = '';

        // Extract content from email body (handle missing body from fallback queries)
        if (message.body && message.body.content) {
          if (message.body.contentType === 'html') {
            emailContent = message.body.content;
          } else {
            emailContent = message.body.content;
          }
        } else {
          console.log(`⚠️ Email body missing (fallback query), using subject only: ${message.subject}`);
          emailContent = message.subject; // Use subject as fallback
        }

        // Process attachments for OCR if any (only if hasAttachments property is available)
        if (message.hasAttachments === true) {
          try {
            const attachments = await graphClient
              .api(`/me/messages/${message.id}/attachments`)
              .get();

            for (const attachment of attachments.value) {
              if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                console.log('🖼️ Processing image attachment with OCR');
                const ocrText = await azureOcrService.extractTextFromImage(attachment.contentBytes);
                emailContent += '\n\nOCR Content:\n' + ocrText;
              }
            }
          } catch (attachmentError) {
            console.error('❌ Error processing attachments:', attachmentError);
          }
        } else if (message.hasAttachments === undefined) {
          console.log('⚠️ Attachment info not available (fallback query), skipping attachment processing');
        }

        // Parse email content
        console.log('🔍 Parsing email:', message.subject);

        let parsedData;
        try {
          parsedData = emailParserService.parseEmailContent(emailContent);
          console.log('📊 Parsed result:', {
            hasAmount: !!parsedData?.amount,
            amount: parsedData?.amount,
            type: parsedData?.type
          });
        } catch (parseError) {
          console.error('❌ Email parsing failed:', parseError);
          skippedEmails.push({
            subject: message.subject,
            reason: `Parsing error: ${parseError.message}`
          });
          continue;
        }

        if (parsedData && parsedData.amount && parsedData.amount > 0) {
          console.log('💰 Creating transaction from parsed data...');

          let transactionData;
          try {
            transactionData = emailParserService.createTransactionFromEmail(
              parsedData,
              user._id,
              {
                id: message.id,
                subject: message.subject,
                receivedDateTime: message.receivedDateTime
              }
            );
            console.log('📝 Transaction data created:', {
              amount: transactionData.amount,
              type: transactionData.type,
              description: transactionData.description
            });
          } catch (createError) {
            console.error('❌ Transaction creation failed:', createError);
            skippedEmails.push({
              subject: message.subject,
              reason: `Transaction creation error: ${createError.message}`
            });
            continue;
          }

          // Create transaction record
          try {
            const transaction = new Transaction({
              ...transactionData,
              messageId: message.id,
              rawText: emailContent.substring(0, 1000), // Store first 1000 chars for debugging
              isProcessed: true,
              createdAt: new Date(message.receivedDateTime)
            });

            await transaction.save();
            processedTransactions.push(transaction);
            newTransactionsCount++;

            console.log('✅ Transaction created:', {
              messageId: message.id,
              amount: transaction.amount,
              type: transaction.type,
              description: transaction.description,
              date: transaction.date
            });

            // Emit real-time update to connected client
            if (io) {
              io.to(`user-${user._id}`).emit('new-transaction', {
                ...transaction.toObject(),
                isNew: true
              });

              // Also emit general notification
              io.to(`user-${user._id}`).emit('notification', {
                type: 'success',
                title: 'Nueva Transacción Detectada',
                message: `${transaction.type}: S/ ${transaction.amount.toFixed(2)} - ${transaction.description}`,
                priority: 'high',
                timestamp: new Date()
              });
            }
          } catch (saveError) {
            console.error('❌ Transaction save failed:', saveError);
            skippedEmails.push({
              subject: message.subject,
              reason: `Database save error: ${saveError.message}`
            });
          }
        } else {
          skippedEmails.push({
            subject: message.subject,
            reason: 'No valid transaction data found'
          });
          console.log('⚠️ No transaction data in email:', message.subject);
        }

      } catch (messageError) {
        console.error(`❌ Error processing message ${message.id}:`, messageError);
        skippedEmails.push({
          subject: message.subject,
          reason: messageError.message
        });
      }
    }

    // Update user's last sync time
    user.lastSync = new Date();
    await user.save();

    // Setup periodic sync if this is the first successful sync
    if (processedTransactions.length > 0 && !user.syncEnabled) {
      user.syncEnabled = true;
      await user.save();
      console.log('🔄 Enabled periodic sync for user');
    }

    const response = {
      message: 'Email sync completed successfully',
      processedCount: processedTransactions.length,
      totalEmails: messages.value.length,
      skippedCount: skippedEmails.length,
      transactions: processedTransactions.map(t => ({
        id: t._id,
        amount: t.amount,
        type: t.type,
        description: t.description,
        date: t.date,
        account: t.account
      })),
      skippedEmails: skippedEmails.slice(0, 5), // Show first 5 skipped for debugging
      syncEnabled: user.syncEnabled,
      lastSync: user.lastSync
    };

    console.log('📊 Sync summary:', {
      processed: processedTransactions.length,
      total: messages.value.length,
      skipped: skippedEmails.length
    });

    res.json(response);

  } catch (error) {
    console.error('❌ Sync emails error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });

    // Handle specific Microsoft Graph errors
    if (error.code === 'InvalidAuthenticationToken' || error.code === 'Forbidden') {
      return res.status(401).json({
        error: 'Microsoft authentication expired',
        details: 'Please reconnect your Microsoft account',
        code: error.code
      });
    }

    // Handle InefficientFilter error with fallback strategy
    if (error.code === 'InefficientFilter') {
      console.log('⚠️ Graph query too complex, attempting fallback with minimal query...');
      return res.status(500).json({
        error: 'Email query complexity issue',
        details: 'Microsoft Graph query is too complex. Please try again with a smaller date range.',
        code: error.code,
        suggestion: 'Reduce the number of emails being processed or try again later'
      });
    }

    // Handle database connection errors
    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return res.status(503).json({
        error: 'Database connection error',
        details: 'Please try again later',
        code: error.code
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error.message,
        code: error.code
      });
    }

    res.status(500).json({
      error: 'Failed to sync emails',
      details: error.message,
      type: error.name || 'Unknown error'
    });
  }
});

// Enable/Disable periodic sync for user
router.post('/sync-toggle', async (req, res) => {
  try {
    const { enabled } = req.body;
    const userId = req.user._id;

    // Only block demo users
    if (userId === 'demo-user-id') {
      return res.status(400).json({
        error: 'Real Microsoft Graph connection required',
        details: 'Demo users cannot enable sync'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.accessToken) {
      return res.status(400).json({
        error: 'Microsoft account not connected',
        details: 'Please connect your Microsoft account first'
      });
    }

    user.syncEnabled = enabled;
    await user.save();

    console.log(`🔄 Sync ${enabled ? 'enabled' : 'disabled'} for user: ${user.email}`);

    res.json({
      message: `Email sync ${enabled ? 'enabled' : 'disabled'} successfully`,
      syncEnabled: user.syncEnabled,
      lastSync: user.lastSync
    });

  } catch (error) {
    console.error('❌ Sync toggle error:', error);
    res.status(500).json({
      error: 'Failed to toggle sync',
      details: error.message
    });
  }
});

// Get sync status for user
router.get('/sync-status', async (req, res) => {
  try {
    const userId = req.user._id;

    // Only treat as demo if it's specifically the demo user ID
    if (userId === 'demo-user-id') {
      return res.json({
        syncEnabled: false,
        lastSync: null,
        isDemo: true,
        message: 'Connect a real Microsoft account to enable sync'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get recent transactions count
    const recentTransactions = await Transaction.countDocuments({
      userId: user._id,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });

    res.json({
      syncEnabled: user.syncEnabled || false,
      lastSync: user.lastSync,
      hasConnection: !!user.accessToken,
      recentTransactions,
      email: user.email,
      isDemo: false
    });

  } catch (error) {
    console.error('❌ Sync status error:', error);
    res.status(500).json({
      error: 'Failed to get sync status',
      details: error.message
    });
  }
});

// Test email parsing endpoint (for development)
router.post('/test-email-parser', async (req, res) => {
  try {
    const { emailContent } = req.body;

    if (!emailContent) {
      return res.status(400).json({ error: 'Email content is required' });
    }

    console.log('🧪 Testing email parser with content length:', emailContent.length);

    // Parse the email content
    const parsedData = emailParserService.parseEmailContent(emailContent);

    // Create a demo transaction object
    const transactionData = emailParserService.createTransactionFromEmail(
      parsedData,
      'test-user-id',
      {
        id: 'test-email-id',
        subject: 'Test Email',
        receivedDateTime: new Date().toISOString()
      }
    );

    res.json({
      success: true,
      parsedData,
      transactionData,
      message: 'Email parsing completed successfully'
    });

  } catch (error) {
    console.error('Email parser test error:', error);
    res.status(500).json({
      error: 'Failed to parse email content',
      details: error.message
    });
  }
});

// Get user's email folders
router.get('/folders', async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if it's a demo user - return demo folders
    if (userId === 'demo-user-id' || userId === 'microsoft-user-id') {
      console.log('🎭 Returning demo Microsoft Graph folders');
      return res.json({
        folders: [
          {
            id: 'demo-inbox',
            displayName: 'Inbox',
            totalItemCount: 142,
            unreadItemCount: 8
          },
          {
            id: 'demo-sent',
            displayName: 'Sent Items',
            totalItemCount: 89,
            unreadItemCount: 0
          },
          {
            id: 'demo-financial',
            displayName: 'Financial',
            totalItemCount: 24,
            unreadItemCount: 2
          },
          {
            id: 'demo-receipts',
            displayName: 'Receipts',
            totalItemCount: 67,
            unreadItemCount: 3
          }
        ],
        demoMode: true
      });
    }

    const user = await User.findById(req.user._id);

    if (!user.accessToken) {
      return res.status(400).json({
        error: 'Microsoft account not connected'
      });
    }

    const graphClient = getGraphClient(user.accessToken);
    const folders = await graphClient.api('/me/mailFolders').get();

    res.json({
      folders: folders.value.map(folder => ({
        id: folder.id,
        displayName: folder.displayName,
        totalItemCount: folder.totalItemCount,
        unreadItemCount: folder.unreadItemCount
      }))
    });

  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({ error: 'Failed to get email folders' });
  }
});

// Get connection status
router.get('/status', async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if it's a demo user - return demo status
    if (userId === 'demo-user-id' || userId === 'microsoft-user-id') {
      console.log('🎭 Returning demo Microsoft Graph status');
      return res.json({
        isConnected: true,
        lastSync: new Date(Date.now() - 86400000).toISOString(), // yesterday
        tokenExpiry: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        demoMode: true
      });
    }

    const user = await User.findById(req.user._id);

    const isConnected = !!(user.accessToken && user.tokenExpiry && user.tokenExpiry > new Date());

    res.json({
      isConnected,
      lastSync: user.lastSync,
      tokenExpiry: user.tokenExpiry
    });

  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: 'Failed to get connection status' });
  }
});

// Disconnect Microsoft account
router.post('/disconnect', async (req, res) => {
  try {
    console.log('📤 Disconnect request from user:', req.user);

    // Handle demo/Microsoft users differently
    if (req.user._id === 'demo-user-id' || req.user._id === 'microsoft-user-id') {
      console.log('🎭 Demo/Microsoft user disconnect - no database operation needed');
      return res.json({
        message: 'Microsoft account disconnected successfully',
        demo: true
      });
    }

    // For real users, update the database
    const updatedUser = await User.findByIdAndUpdate(req.user._id, {
      $unset: {
        accessToken: 1,
        refreshToken: 1,
        tokenExpiry: 1,
        microsoftId: 1
      }
    }, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ User disconnected successfully:', updatedUser._id);
    res.json({ message: 'Microsoft account disconnected successfully' });

  } catch (error) {
    console.error('❌ Disconnect error:', error);
    res.status(500).json({
      error: 'Failed to disconnect Microsoft account',
      details: error.message
    });
  }
});

module.exports = router;
