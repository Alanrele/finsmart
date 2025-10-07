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
    const userId = req.user._id;

    // For demo/Microsoft users, still require proper Graph connection
    if (userId === 'demo-user-id' || userId === 'microsoft-user-id') {
      return res.status(400).json({
        error: 'Real Microsoft Graph connection required',
        details: 'Please connect with a real Microsoft account to sync emails'
      });
    }

    const user = await User.findById(req.user._id);

    if (!user.accessToken) {
      return res.status(400).json({
        error: 'Microsoft account not connected',
        details: 'Please connect your Microsoft account first'
      });
    }

    const graphClient = getGraphClient(user.accessToken);

    // Get emails from BCP notifications with expanded date range
    const bcpFilters = [
      "from/emailAddress/address eq 'notificaciones@bcp.com.pe'",
      "from/emailAddress/address eq 'bcp@bcp.com.pe'",
      "from/emailAddress/address eq 'alertas@bcp.com.pe'",
      "from/emailAddress/address eq 'movimientos@bcp.com.pe'"
    ];
    
    const filter = bcpFilters.join(' or ');
    const select = 'id,subject,body,receivedDateTime,from,hasAttachments';
    const orderBy = 'receivedDateTime desc';
    const top = 100; // Increased to get more historical emails

    console.log('📧 Fetching emails with filter:', filter);

    const messages = await graphClient
      .api('/me/messages')
      .filter(filter)
      .select(select)
      .orderby(orderBy)
      .top(top)
      .get();

    console.log(`📨 Found ${messages.value.length} emails from BCP`);

    const processedTransactions = [];
    const skippedEmails = [];
    const io = req.app.get('io');

    for (const message of messages.value) {
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

        let emailContent = '';

        // Extract content from email body
        if (message.body.contentType === 'html') {
          emailContent = message.body.content;
        } else {
          emailContent = message.body.content;
        }

        // Process attachments for OCR if any
        if (message.hasAttachments) {
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
        }

        // Parse email content
        console.log('🔍 Parsing email:', message.subject);
        const parsedData = emailParserService.parseEmailContent(emailContent);

        if (parsedData && parsedData.amount && parsedData.amount > 0) {
          // Create transaction from parsed data
          const transactionData = emailParserService.createTransactionFromEmail(
            parsedData,
            user._id,
            {
              id: message.id,
              subject: message.subject,
              receivedDateTime: message.receivedDateTime
            }
          );

          // Create transaction record
          const transaction = new Transaction({
            ...transactionData,
            messageId: message.id,
            rawText: emailContent.substring(0, 1000), // Store first 1000 chars for debugging
            isProcessed: true,
            createdAt: new Date(message.receivedDateTime)
          });

          await transaction.save();
          processedTransactions.push(transaction);

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
    console.error('❌ Sync emails error:', error);

    if (error.code === 'InvalidAuthenticationToken') {
      return res.status(401).json({
        error: 'Microsoft authentication expired',
        details: 'Please reconnect your Microsoft account'
      });
    }

    res.status(500).json({ 
      error: 'Failed to sync emails',
      details: error.message 
    });
  }
});

// Enable/Disable periodic sync for user
router.post('/sync-toggle', async (req, res) => {
  try {
    const { enabled } = req.body;
    const userId = req.user._id;

    if (userId === 'demo-user-id' || userId === 'microsoft-user-id') {
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

    if (userId === 'demo-user-id' || userId === 'microsoft-user-id') {
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
      email: user.email
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
