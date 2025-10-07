const express = require('express');
const { Client } = require('@microsoft/microsoft-graph-client');
const { AuthenticationProvider } = require('@microsoft/microsoft-graph-client');
const { body, validationResult } = require('express-validator');
const User = require('../models/userModel');
const Transaction = require('../models/transactionModel');
const azureOcrService = require('../services/azureOcrService');
const aiAnalysisService = require('../services/aiAnalysisService');

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
    
    // Check if it's a demo user - return demo data
    if (userId === 'demo-user-id' || userId === 'microsoft-user-id') {
      console.log('🎭 Returning demo email sync data');
      return res.json({
        message: 'Emails synchronized successfully',
        processed: 8,
        newTransactions: 3,
        emails: [
          {
            id: 'demo-email-1',
            subject: 'Movimiento en tu Cuenta BCP - Compra por S/125.50',
            date: new Date(Date.now() - 86400000).toISOString(),
            processed: true
          },
          {
            id: 'demo-email-2', 
            subject: 'Transferencia recibida - S/750.00',
            date: new Date(Date.now() - 86400000 * 2).toISOString(),
            processed: true
          },
          {
            id: 'demo-email-3',
            subject: 'Pago de servicios - S/35.75', 
            date: new Date(Date.now() - 86400000 * 3).toISOString(),
            processed: true
          }
        ],
        demoMode: true
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

    // Get emails from BCP notifications
    const filter = "from/emailAddress/address eq 'notificaciones@bcp.com.pe' or from/emailAddress/address eq 'bcp@bcp.com.pe'";
    const select = 'id,subject,body,receivedDateTime,from,hasAttachments';
    const orderBy = 'receivedDateTime desc';
    const top = 50;

    const messages = await graphClient
      .api('/me/messages')
      .filter(filter)
      .select(select)
      .orderby(orderBy)
      .top(top)
      .get();

    const processedTransactions = [];
    const io = req.app.get('io');

    for (const message of messages.value) {
      try {
        // Check if message already processed
        const existingTransaction = await Transaction.findOne({
          messageId: message.id,
          userId: user._id
        });

        if (existingTransaction) {
          continue; // Skip already processed message
        }

        let emailContent = '';

        // Extract text from email body
        if (message.body.contentType === 'html') {
          emailContent = message.body.content.replace(/<[^>]*>/g, ''); // Strip HTML
        } else {
          emailContent = message.body.content;
        }

        // Process attachments if any (images for OCR)
        if (message.hasAttachments) {
          const attachments = await graphClient
            .api(`/me/messages/${message.id}/attachments`)
            .get();

          for (const attachment of attachments.value) {
            if (attachment.contentType && attachment.contentType.startsWith('image/')) {
              try {
                const ocrText = await azureOcrService.extractTextFromImage(attachment.contentBytes);
                emailContent += '\n' + ocrText;
              } catch (ocrError) {
                console.error('OCR processing failed:', ocrError);
              }
            }
          }
        }

        // Analyze with AI to extract transaction data
        const transactionData = await aiAnalysisService.extractTransactionData(emailContent);

        if (transactionData && transactionData.amount) {
          // Create transaction record
          const transaction = new Transaction({
            userId: user._id,
            messageId: message.id,
            amount: Math.abs(transactionData.amount),
            type: transactionData.type || 'debit',
            category: transactionData.category || 'other',
            subcategory: transactionData.subcategory,
            merchant: transactionData.merchant,
            description: transactionData.description || message.subject,
            channel: transactionData.channel || 'other',
            operationNumber: transactionData.operationNumber,
            cardNumber: transactionData.cardNumber,
            date: transactionData.date || new Date(message.receivedDateTime),
            balance: transactionData.balance,
            location: transactionData.location,
            rawText: emailContent,
            isProcessed: true,
            aiAnalysis: {
              confidence: transactionData.confidence || 0.8,
              insights: transactionData.insights || [],
              recommendations: transactionData.recommendations || []
            }
          });

          await transaction.save();
          processedTransactions.push(transaction);

          // Emit real-time update
          io.to(`user-${user._id}`).emit('new-transaction', transaction);
        }

      } catch (messageError) {
        console.error(`Error processing message ${message.id}:`, messageError);
      }
    }

    // Update user's last sync time
    user.lastSync = new Date();
    await user.save();

    res.json({
      message: 'Email sync completed',
      processedCount: processedTransactions.length,
      totalEmails: messages.value.length,
      transactions: processedTransactions
    });

  } catch (error) {
    console.error('Sync emails error:', error);

    if (error.code === 'InvalidAuthenticationToken') {
      return res.status(401).json({
        error: 'Microsoft authentication expired',
        details: 'Please reconnect your Microsoft account'
      });
    }

    res.status(500).json({ error: 'Failed to sync emails' });
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
    await User.findByIdAndUpdate(req.user._id, {
      $unset: {
        accessToken: 1,
        refreshToken: 1,
        tokenExpiry: 1,
        microsoftId: 1
      }
    });

    res.json({ message: 'Microsoft account disconnected successfully' });

  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect Microsoft account' });
  }
});

module.exports = router;
