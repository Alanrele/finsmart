const express = require('express');
const { query, body, validationResult } = require('express-validator');
const Transaction = require('../models/transactionModel');
const User = require('../models/userModel');

const router = express.Router();

// Get user's financial dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get current month transactions
    const currentMonthTransactions = await Transaction.find({
      userId,
      date: {
        $gte: new Date(currentYear, currentMonth - 1, 1),
        $lt: new Date(currentYear, currentMonth, 1)
      }
    });

    // Calculate spending by category
    const categorySpending = {};
    let totalSpending = 0;
    let totalIncome = 0;

    currentMonthTransactions.forEach(transaction => {
      if (transaction.type === 'credit' || transaction.type === 'deposit') {
        totalIncome += transaction.amount;
      } else {
        totalSpending += transaction.amount;
        categorySpending[transaction.category] = (categorySpending[transaction.category] || 0) + transaction.amount;
      }
    });

    // Get recent transactions (last 10)
    const recentTransactions = await Transaction.find({ userId })
      .sort({ date: -1 })
      .limit(10);

    // Get monthly comparison (current vs previous month)
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const previousMonthTransactions = await Transaction.find({
      userId,
      date: {
        $gte: new Date(previousYear, previousMonth - 1, 1),
        $lt: new Date(previousYear, previousMonth, 1)
      },
      type: { $in: ['debit', 'payment', 'withdrawal'] }
    });

    const previousMonthSpending = previousMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
    const spendingChange = totalSpending - previousMonthSpending;
    const spendingChangePercentage = previousMonthSpending > 0 ? (spendingChange / previousMonthSpending) * 100 : 0;

    // Get top spending categories
    const topCategories = Object.entries(categorySpending)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount }));

    // Calculate balance
    const balance = totalIncome - totalSpending;

    res.json({
      summary: {
        totalSpending,
        totalIncome,
        balance,
        transactionCount: currentMonthTransactions.length,
        spendingChange,
        spendingChangePercentage: Math.round(spendingChangePercentage * 100) / 100
      },
      categorySpending,
      topCategories,
      recentTransactions,
      period: {
        month: currentMonth,
        year: currentYear
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

// Get transactions with filters
router.get('/transactions', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isString(),
  query('type').optional().isIn(['debit', 'credit', 'transfer', 'payment', 'withdrawal', 'deposit']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { userId };

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.type) {
      filter.type = req.query.type;
    }

    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate) {
        filter.date.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.date.$lte = new Date(req.query.endDate);
      }
    }

    // Get transactions with pagination
    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalCount = await Transaction.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      transactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// Get spending by category
router.get('/spending/categories', [
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user._id;
    const period = req.query.period || 'month';

    // Calculate date range
    let dateFilter = {};
    const now = new Date();

    if (req.query.startDate && req.query.endDate) {
      dateFilter = {
        date: {
          $gte: new Date(req.query.startDate),
          $lte: new Date(req.query.endDate)
        }
      };
    } else {
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
    }

    // Aggregate spending by category
    const categorySpending = await Transaction.aggregate([
      {
        $match: {
          userId: userId,
          type: { $in: ['debit', 'payment', 'withdrawal'] },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      },
      {
        $sort: { totalAmount: -1 }
      }
    ]);

    // Calculate total spending
    const totalSpending = categorySpending.reduce((sum, cat) => sum + cat.totalAmount, 0);

    // Add percentage to each category
    const categoriesWithPercentage = categorySpending.map(cat => ({
      category: cat._id,
      amount: cat.totalAmount,
      count: cat.count,
      avgAmount: Math.round(cat.avgAmount * 100) / 100,
      percentage: totalSpending > 0 ? Math.round((cat.totalAmount / totalSpending) * 10000) / 100 : 0
    }));

    res.json({
      period,
      totalSpending,
      categories: categoriesWithPercentage
    });

  } catch (error) {
    console.error('Get category spending error:', error);
    res.status(500).json({ error: 'Failed to get category spending' });
  }
});

// Get spending trends
router.get('/trends', [
  query('months').optional().isInt({ min: 1, max: 12 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user._id;
    const months = parseInt(req.query.months) || 6;

    const trends = await Transaction.getSpendingTrends(userId, months);

    // Format trends data
    const formattedTrends = trends.reduce((acc, trend) => {
      const monthKey = `${trend._id.year}-${String(trend._id.month).padStart(2, '0')}`;

      if (!acc[monthKey]) {
        acc[monthKey] = {
          period: monthKey,
          year: trend._id.year,
          month: trend._id.month,
          categories: {},
          totalSpending: 0
        };
      }

      acc[monthKey].categories[trend._id.category] = {
        amount: trend.totalAmount,
        count: trend.count
      };
      acc[monthKey].totalSpending += trend.totalAmount;

      return acc;
    }, {});

    const trendsArray = Object.values(formattedTrends).sort((a, b) => {
      return new Date(a.year, a.month - 1) - new Date(b.year, b.month - 1);
    });

    res.json({
      months,
      trends: trendsArray
    });

  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({ error: 'Failed to get spending trends' });
  }
});

// Get financial summary
router.get('/summary', [
  query('year').optional().isInt({ min: 2020, max: 2030 }),
  query('month').optional().isInt({ min: 1, max: 12 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user._id;
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);

    const summary = await Transaction.getMonthlySummary(userId, year, month);

    // Calculate totals
    const totalSpending = summary.reduce((sum, cat) => sum + cat.totalAmount, 0);
    const totalTransactions = summary.reduce((sum, cat) => sum + cat.count, 0);

    // Get income for the period
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const incomeTransactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
      type: { $in: ['credit', 'deposit'] }
    });

    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalSpending;

    res.json({
      period: { year, month },
      summary: {
        totalSpending,
        totalIncome,
        balance,
        totalTransactions,
        avgTransactionAmount: totalTransactions > 0 ? Math.round((totalSpending / totalTransactions) * 100) / 100 : 0
      },
      categories: summary,
      income: incomeTransactions.length
    });

  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Failed to get financial summary' });
  }
});

// Update user preferences
router.patch('/preferences', [
  body('theme').optional().isIn(['light', 'dark']),
  body('currency').optional().isString(),
  body('notifications.email').optional().isBoolean(),
  body('notifications.push').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user._id;
    const updates = {};

    if (req.body.theme) {
      updates['preferences.theme'] = req.body.theme;
    }

    if (req.body.currency) {
      updates['preferences.currency'] = req.body.currency;
    }

    if (req.body.notifications) {
      if (req.body.notifications.email !== undefined) {
        updates['preferences.notifications.email'] = req.body.notifications.email;
      }
      if (req.body.notifications.push !== undefined) {
        updates['preferences.notifications.push'] = req.body.notifications.push;
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    );

    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

module.exports = router;
