const express = require('express');
const { query, body, validationResult } = require('express-validator');
const Transaction = require('../models/transactionModel');
const User = require('../models/userModel');

const router = express.Router();

// Get user's financial dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log('📊 Dashboard endpoint called for user:', userId);

    // Check if it's a demo user - return demo data
    if (userId === 'demo-user-id' || userId === 'microsoft-user-id') {
      console.log('🎭 Returning demo dashboard data');
      return res.json({
        summary: {
          totalBalance: 15750.50,
          monthlyIncome: 8500.00,
          monthlyExpenses: 3200.75,
          totalSavings: 12549.75
        },
        categorySpending: [
          { category: 'Food', amount: 1200.50, percentage: 37.5 },
          { category: 'Transportation', amount: 580.25, percentage: 18.1 },
          { category: 'Entertainment', amount: 420.80, percentage: 13.1 },
          { category: 'Utilities', amount: 380.30, percentage: 11.9 },
          { category: 'Shopping', amount: 320.15, percentage: 10.0 },
          { category: 'Others', amount: 296.75, percentage: 9.4 }
        ],
        topCategories: [
          { category: 'Food', amount: 1200.50 },
          { category: 'Transportation', amount: 580.25 },
          { category: 'Entertainment', amount: 420.80 },
          { category: 'Utilities', amount: 380.30 },
          { category: 'Shopping', amount: 320.15 }
        ],
        recentTransactions: [
          {
            _id: 'demo1',
            description: 'Salario - Trabajo Principal',
            amount: 8500.00,
            type: 'income',
            category: 'Salary',
            date: new Date().toISOString(),
            isAI: false
          },
          {
            _id: 'demo2',
            description: 'Supermercado Metro',
            amount: -285.50,
            type: 'expense',
            category: 'Food',
            date: new Date(Date.now() - 86400000).toISOString(),
            isAI: false
          },
          {
            _id: 'demo3',
            description: 'Netflix Suscripción',
            amount: -15.99,
            type: 'expense',
            category: 'Entertainment',
            date: new Date(Date.now() - 2 * 86400000).toISOString(),
            isAI: false
          },
          {
            _id: 'demo4',
            description: 'Transferencia Ahorros',
            amount: -1000.00,
            type: 'transfer',
            category: 'Savings',
            date: new Date(Date.now() - 3 * 86400000).toISOString(),
            isAI: false
          },
          {
            _id: 'demo5',
            description: 'Pago Servicios Públicos',
            amount: -125.30,
            type: 'expense',
            category: 'Utilities',
            date: new Date(Date.now() - 4 * 86400000).toISOString(),
            isAI: false
          }
        ]
      });
    }

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
  query('search').optional().isString(),
  query('category').optional().isString(),
  query('type').optional().custom(value => {
    if (!value || value === '') return true;
    return ['debit', 'credit', 'transfer', 'payment', 'withdrawal', 'deposit', 'income', 'expense'].includes(value);
  }),
  query('startDate').optional().custom(value => {
    if (!value || value === '') return true;
    return !isNaN(Date.parse(value));
  }),
  query('endDate').optional().custom(value => {
    if (!value || value === '') return true;
    return !isNaN(Date.parse(value));
  })
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
    
    // Check if it's a demo user - return demo data
    if (userId === 'demo-user-id' || userId === 'microsoft-user-id') {
      console.log('🎭 Returning demo transactions data');
      let demoTransactions = [
        {
          _id: 'demo-trans-1',
          description: 'Salario - Trabajo Principal',
          amount: 8500.00,
          type: 'income',
          category: 'Salary',
          date: new Date(Date.now() - 86400000).toISOString(), // yesterday
          isAI: false
        },
        {
          _id: 'demo-trans-2',
          description: 'Supermercado Central',
          amount: -125.50,
          type: 'expense',
          category: 'Food',
          date: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
          isAI: true
        },
        {
          _id: 'demo-trans-3',
          description: 'Transferencia a Ahorros',
          amount: -1000.00,
          type: 'transfer',
          category: 'Savings',
          date: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
          isAI: false
        },
        {
          _id: 'demo-trans-4',
          description: 'Pago Uber',
          amount: -35.75,
          type: 'expense',
          category: 'Transportation',
          date: new Date(Date.now() - 86400000 * 4).toISOString(), // 4 days ago
          isAI: true
        },
        {
          _id: 'demo-trans-5',
          description: 'Freelance Payment',
          amount: 750.00,
          type: 'income',
          category: 'Freelance',
          date: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
          isAI: false
        }
      ];

      // Apply demo filters
      if (req.query.search && req.query.search.trim() !== '') {
        const searchTerm = req.query.search.toLowerCase();
        demoTransactions = demoTransactions.filter(t => 
          t.description.toLowerCase().includes(searchTerm) ||
          t.category.toLowerCase().includes(searchTerm)
        );
      }

      if (req.query.category && req.query.category.trim() !== '') {
        demoTransactions = demoTransactions.filter(t => 
          t.category.toLowerCase() === req.query.category.toLowerCase()
        );
      }

      if (req.query.type && req.query.type.trim() !== '') {
        demoTransactions = demoTransactions.filter(t => t.type === req.query.type);
      }

      return res.json({
        transactions: demoTransactions,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: demoTransactions.length,
          hasNext: false,
          hasPrev: false
        }
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { userId };

    if (req.query.search && req.query.search.trim() !== '') {
      filter.$or = [
        { description: { $regex: req.query.search, $options: 'i' } },
        { category: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    if (req.query.category && req.query.category.trim() !== '') {
      filter.category = req.query.category;
    }

    if (req.query.type && req.query.type.trim() !== '') {
      filter.type = req.query.type;
    }

    if ((req.query.startDate && req.query.startDate.trim() !== '') || (req.query.endDate && req.query.endDate.trim() !== '')) {
      filter.date = {};
      if (req.query.startDate && req.query.startDate.trim() !== '') {
        filter.date.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate && req.query.endDate.trim() !== '') {
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
    
    // Check if it's a demo user - return demo data
    if (userId === 'demo-user-id' || userId === 'microsoft-user-id') {
      console.log('🎭 Returning demo spending categories data');
      return res.json([
        { 
          _id: 'Food', 
          totalAmount: 1200.50, 
          count: 15,
          percentage: 37.5,
          avgAmount: 80.03
        },
        { 
          _id: 'Transportation', 
          totalAmount: 580.25, 
          count: 8,
          percentage: 18.1,
          avgAmount: 72.53
        },
        { 
          _id: 'Entertainment', 
          totalAmount: 420.80, 
          count: 6,
          percentage: 13.1,
          avgAmount: 70.13
        },
        { 
          _id: 'Utilities', 
          totalAmount: 380.30, 
          count: 4,
          percentage: 11.9,
          avgAmount: 95.08
        },
        { 
          _id: 'Shopping', 
          totalAmount: 320.15, 
          count: 5,
          percentage: 10.0,
          avgAmount: 64.03
        },
        { 
          _id: 'Others', 
          totalAmount: 296.75, 
          count: 7,
          percentage: 9.4,
          avgAmount: 42.39
        }
      ]);
    }

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
    
    // Check if it's a demo user - return demo data
    if (userId === 'demo-user-id' || userId === 'microsoft-user-id') {
      console.log('🎭 Returning demo trends data');
      const currentDate = new Date();
      const demoTrends = [];
      
      // Generate 6 months of demo trend data
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        demoTrends.push({
          period: monthKey,
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          categories: {
            Food: { amount: 1100 + Math.random() * 200, count: 12 + Math.floor(Math.random() * 6) },
            Transportation: { amount: 500 + Math.random() * 150, count: 6 + Math.floor(Math.random() * 4) },
            Entertainment: { amount: 350 + Math.random() * 140, count: 4 + Math.floor(Math.random() * 4) },
            Utilities: { amount: 320 + Math.random() * 120, count: 3 + Math.floor(Math.random() * 2) },
            Shopping: { amount: 280 + Math.random() * 80, count: 3 + Math.floor(Math.random() * 4) }
          },
          totalSpending: 2550 + Math.random() * 690
        });
      }
      
      return res.json(demoTrends);
    }

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
    
    // Check if it's a demo user - return demo data
    if (userId === 'demo-user-id' || userId === 'microsoft-user-id') {
      console.log('🎭 Returning demo summary data');
      const now = new Date();
      const year = parseInt(req.query.year) || now.getFullYear();
      const month = parseInt(req.query.month) || (now.getMonth() + 1);
      
      return res.json({
        period: { year, month },
        summary: {
          totalSpending: 3200.75,
          totalIncome: 8500.00,
          balance: 5299.25,
          totalTransactions: 28,
          avgTransactionAmount: 114.31
        },
        categories: [
          { _id: 'Food', totalAmount: 1200.50, count: 15, avgAmount: 80.03 },
          { _id: 'Transportation', totalAmount: 580.25, count: 8, avgAmount: 72.53 },
          { _id: 'Entertainment', totalAmount: 420.80, count: 6, avgAmount: 70.13 },
          { _id: 'Utilities', totalAmount: 380.30, count: 4, avgAmount: 95.08 },
          { _id: 'Shopping', totalAmount: 320.15, count: 5, avgAmount: 64.03 },
          { _id: 'Others', totalAmount: 296.75, count: 7, avgAmount: 42.39 }
        ],
        income: 2
      });
    }

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
