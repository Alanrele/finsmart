const express = require('express');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/transactionModel');
const aiAnalysisService = require('../services/aiAnalysisService');

const router = express.Router();

// Analyze financial data
router.post('/analyze', async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = 'month', category } = req.body;

    // Get transactions for analysis
    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case 'week':
        dateFilter = {
          date: {
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
          }
        };
        break;
      case 'month':
        dateFilter = {
          date: {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1)
          }
        };
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        dateFilter = {
          date: {
            $gte: new Date(now.getFullYear(), quarter * 3, 1)
          }
        };
        break;
      case 'year':
        dateFilter = {
          date: {
            $gte: new Date(now.getFullYear(), 0, 1)
          }
        };
        break;
    }

    const filter = { userId, ...dateFilter };
    if (category) {
      filter.category = category;
    }

    const transactions = await Transaction.find(filter).sort({ date: -1 });

    if (transactions.length === 0) {
      return res.json({
        message: 'No transactions found for analysis',
        analysis: {
          summary: 'No financial data available for the selected period.',
          insights: [],
          recommendations: [],
          spending: { total: 0, categories: [] },
          trends: []
        }
      });
    }

    // Generate AI analysis
    const analysis = await aiAnalysisService.generateFinancialAnalysis(transactions, period);

    res.json({
      message: 'Financial analysis completed',
      period,
      transactionCount: transactions.length,
      analysis
    });

  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({ error: 'Failed to generate financial analysis' });
  }
});

// Chat with AI about finances
router.post('/chat', [
  body('message').trim().isLength({ min: 1 }).withMessage('Message is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { message } = req.body;
    const userId = req.user._id;

    // Get user's recent transactions for context
    const recentTransactions = await Transaction.find({ userId })
      .sort({ date: -1 })
      .limit(50);

    // Generate AI response
    const response = await aiAnalysisService.generateChatResponse(message, recentTransactions);

    res.json({
      message: 'AI response generated',
      response,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

// Get spending insights
router.get('/insights', async (req, res) => {
  try {
    const userId = req.user._id;
    const { months = 3 } = req.query;

    // Get spending trends
    const trends = await Transaction.getSpendingTrends(userId, parseInt(months));

    // Get current month summary
    const now = new Date();
    const monthlyData = await Transaction.getMonthlySummary(userId, now.getFullYear(), now.getMonth() + 1);

    // Calculate insights
    const insights = await aiAnalysisService.generateSpendingInsights(trends, monthlyData);

    res.json({
      message: 'Spending insights generated',
      trends,
      monthlyData,
      insights
    });

  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ error: 'Failed to get spending insights' });
  }
});

// Get financial recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const userId = req.user._id;

    // Get last 3 months of transactions
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const transactions = await Transaction.find({
      userId,
      date: { $gte: threeMonthsAgo }
    }).sort({ date: -1 });

    // Generate personalized recommendations
    const recommendations = await aiAnalysisService.generateRecommendations(transactions);

    res.json({
      message: 'Financial recommendations generated',
      recommendations,
      basedOnTransactions: transactions.length
    });

  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to get financial recommendations' });
  }
});

// Predict next month spending
router.get('/predict', async (req, res) => {
  try {
    const userId = req.user._id;

    // Get last 6 months of transactions for prediction
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const transactions = await Transaction.find({
      userId,
      date: { $gte: sixMonthsAgo },
      type: { $in: ['debit', 'payment', 'withdrawal'] }
    }).sort({ date: -1 });

    // Generate spending prediction
    const prediction = await aiAnalysisService.predictSpending(transactions);

    res.json({
      message: 'Spending prediction generated',
      prediction,
      basedOnTransactions: transactions.length
    });

  } catch (error) {
    console.error('Predict spending error:', error);
    res.status(500).json({ error: 'Failed to predict spending' });
  }
});

// Categorize transactions with AI
router.post('/categorize', async (req, res) => {
  try {
    const userId = req.user._id;

    // Find uncategorized transactions
    const uncategorizedTransactions = await Transaction.find({
      userId,
      category: 'other',
      isProcessed: false
    }).limit(20);

    const categorizedCount = 0;

    for (const transaction of uncategorizedTransactions) {
      try {
        const categoryData = await aiAnalysisService.categorizeTransaction(transaction.rawText);

        if (categoryData.category && categoryData.category !== 'other') {
          transaction.category = categoryData.category;
          transaction.subcategory = categoryData.subcategory;
          transaction.merchant = categoryData.merchant || transaction.merchant;
          transaction.isProcessed = true;

          await transaction.save();
          categorizedCount++;
        }
      } catch (categorizeError) {
        console.error(`Failed to categorize transaction ${transaction._id}:`, categorizeError);
      }
    }

    res.json({
      message: 'Transaction categorization completed',
      categorizedCount,
      totalProcessed: uncategorizedTransactions.length
    });

  } catch (error) {
    console.error('Categorize transactions error:', error);
    res.status(500).json({ error: 'Failed to categorize transactions' });
  }
});

module.exports = router;
