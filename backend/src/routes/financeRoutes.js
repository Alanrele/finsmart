const express = require('express');
const { query, body, validationResult } = require('express-validator');
const Transaction = require('../models/transactionModel');
const User = require('../models/userModel');
const { isDbConnected } = require('../config/prisma');

const router = express.Router();
const ALLOW_DEMO_MODE = process.env.ALLOW_DEMO_MODE === 'true';
const MAX_TX_AMOUNT = parseInt(process.env.MAX_TX_AMOUNT || '10000000', 10); // S/ 10M por defecto

// Get user's financial dashboard
router.get('/dashboard', async (req, res) => {
  try {
    console.log('📊 Dashboard endpoint called');
    console.log('👤 User from auth middleware:', req.user);

    if (!req.user || !req.user._id) {
      console.error('❌ No user found in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user._id;
    console.log('🆔 User ID:', userId);

    // Check if the database is connected
    if (!isDbConnected()) {
      // If not connected, we can't proceed. Return an error.
      console.error('❌ Database not connected. Cannot fetch dashboard data.');
      return res.status(503).json({
        error: 'Servicio no disponible',
        message: 'La conexión con la base de datos no está disponible en este momento.'
      });
    }



    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const requestedMonth = parseInt(req.query.month, 10);
    const requestedYear = parseInt(req.query.year, 10);

    let selectedMonth = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12
      ? requestedMonth
      : currentMonth;
    let selectedYear = Number.isInteger(requestedYear)
      ? requestedYear
      : currentYear;

    if (
      selectedYear > currentYear ||
      (selectedYear === currentYear && selectedMonth > currentMonth)
    ) {
      selectedMonth = currentMonth;
      selectedYear = currentYear;
    }

    // range=all → sin filtro de fechas: el panel muestra el historial completo
    const allTime = req.query.range === 'all';
    const startDate = allTime ? new Date(0) : new Date(selectedYear, selectedMonth - 1, 1);
    const endDate = allTime ? new Date(currentYear + 2, 0, 1) : new Date(selectedYear, selectedMonth, 1);

    // Redondear todos los valores para evitar problemas de precisión
    const roundToTwo = (num) => Math.round(num * 100) / 100;

    // Get selected month transactions (filtrar montos irreales)
    const currentMonthTransactions = await Transaction.find({
      userId,
      date: {
        $gte: startDate,
        $lt: endDate
      },
      amount: { $gt: 0, $lte: MAX_TX_AMOUNT }
    });

    // Calculate spending by category
    const categorySpending = {};
    let totalSpending = 0;
    let totalIncome = 0;

    currentMonthTransactions.forEach(transaction => {
      // Validar y limpiar el monto de la transacción
      const amount = Number(transaction.amount) || 0;
      const validAmount = isNaN(amount) ? 0 : Math.abs(amount);

      // Limitar montos extremadamente grandes (más de 1 millón)
      const clampedAmount = Math.min(validAmount, 1000000);

      if (transaction.type === 'credit' || transaction.type === 'deposit') {
        totalIncome += clampedAmount;
      } else {
        totalSpending += clampedAmount;
        categorySpending[transaction.category] = (categorySpending[transaction.category] || 0) + clampedAmount;
      }
    });

    // Get recent transactions (last 10 within selected period)
    const recentTransactions = await Transaction.find({
      userId,
      date: {
        $gte: startDate,
        $lt: endDate
      }
    })
      .sort({ date: -1 })
      .limit(10);

    // Get monthly comparison (current vs previous month) — no aplica en historial completo
    let spendingChange = 0;
    let spendingChangePercentage = null;
    if (!allTime) {
      const previousMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
      const previousYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;

      const previousMonthTransactions = await Transaction.find({
        userId,
        date: {
          $gte: new Date(previousYear, previousMonth - 1, 1),
          $lt: new Date(previousYear, previousMonth, 1)
        },
        type: { $in: ['debit', 'payment', 'withdrawal'] },
        amount: { $gt: 0, $lte: MAX_TX_AMOUNT }
      });

      const previousMonthSpending = previousMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
      spendingChange = totalSpending - previousMonthSpending;
      spendingChangePercentage = previousMonthSpending > 0 ? (spendingChange / previousMonthSpending) * 100 : 0;
    }

    // Get top spending categories with percentages
    let topCategories = [];
    try {
      topCategories = Object.entries(categorySpending)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category, amount]) => ({
          category,
          amount: roundToTwo(amount),
          percentage: totalSpending > 0 ? roundToTwo((amount / totalSpending) * 100) : 0
        }));
    } catch (error) {
      console.error('Error processing topCategories:', error);
      topCategories = [];
    }

    // Create categorySpending array with percentages for pie chart
    let categorySpendingArray = [];
    try {
      console.log('🔍 Processing categorySpendingArray...');
      console.log('Total spending:', totalSpending);
      console.log('Category spending:', categorySpending);

      categorySpendingArray = Object.entries(categorySpending)
        .sort(([,a], [,b]) => b - a)
        .map(([category, amount]) => {
          const percentage = totalSpending > 0 ? roundToTwo((amount / totalSpending) * 100) : 0;
          console.log(`Category ${category}: amount=${amount}, percentage=${percentage}`);
          return {
            category,
            amount: roundToTwo(amount),
            percentage
          };
        });

      console.log('CategorySpendingArray after mapping:', categorySpendingArray);

      // If no categories or all categories are very small, add "Other" category
      if (categorySpendingArray.length === 0 || totalSpending === 0) {
        console.log('Adding "Otros" category due to no spending or categories');
        categorySpendingArray.push({
          category: 'Otros',
          amount: 0,
          percentage: 100
        });
      } else if (categorySpendingArray.length > 5) {
        console.log('Grouping remaining categories into "Other"');
        // Group remaining categories into "Other"
        const top5Total = categorySpendingArray.slice(0, 5).reduce((sum, cat) => {
          const amount = cat?.amount || 0;
          console.log(`Adding to top5Total: ${amount}`);
          return sum + amount;
        }, 0);

        console.log('Top 5 total:', top5Total);
        console.log('Total spending:', totalSpending);

        const otherAmount = totalSpending - top5Total;
        console.log('Other amount calculated:', otherAmount);

        if (otherAmount > 0) {
          console.log('Adding "Otros" category with positive amount');
          categorySpendingArray.splice(5); // Keep only top 5
          categorySpendingArray.push({
            category: 'Otros',
            amount: roundToTwo(otherAmount),
            percentage: roundToTwo((otherAmount / totalSpending) * 100)
          });
        } else {
          console.log('Other amount is not positive, skipping "Otros" category');
        }
      }
    } catch (error) {
      console.error('❌ Error processing categorySpendingArray:', error);
      console.error('Stack trace:', error.stack);
      categorySpendingArray = [{
        category: 'Otros',
        amount: 0,
        percentage: 100
      }];
    }

    // Movimientos sin clasificar (indicador del dashboard; independiente del mes)
    let unclassifiedCount = 0;
    try {
      unclassifiedCount = await Transaction.countDocuments({ userId, category: 'unclassified' });
    } catch (e) {
      unclassifiedCount = 0;
    }

    // Top comercios/descripciones por gasto del periodo seleccionado
    const merchantTotals = {};
    currentMonthTransactions.forEach((t) => {
      if (t.type === 'credit' || t.type === 'deposit') return;
      const key = (t.merchant || t.description || 'Otro').slice(0, 40);
      merchantTotals[key] = (merchantTotals[key] || 0) + (Math.abs(Number(t.amount)) || 0);
    });
    const topMerchants = Object.entries(merchantTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount: roundToTwo(amount) }));

    // Calculate balance
    const balance = totalIncome - totalSpending;

    // Log para debugging
    console.log('📊 Dashboard summary:', {
      totalSpending: roundToTwo(totalSpending),
      totalIncome: roundToTwo(totalIncome),
      balance: roundToTwo(balance),
      transactionCount: currentMonthTransactions.length,
      categorySpendingKeys: Object.keys(categorySpending),
      categorySpendingArrayLength: categorySpendingArray.length,
      topCategoriesLength: topCategories.length
    });

    res.json({
      summary: {
        totalSpending: roundToTwo(totalSpending),
        totalIncome: roundToTwo(totalIncome),
        balance: roundToTwo(balance),
        transactionCount: currentMonthTransactions.length,
        spendingChange: roundToTwo(spendingChange),
        spendingChangePercentage: spendingChangePercentage === null ? null : roundToTwo(spendingChangePercentage),
        unclassifiedCount
      },
      categorySpending: categorySpendingArray,
      topCategories,
      topMerchants,
      recentTransactions,
      period: {
        month: selectedMonth,
        year: selectedYear,
        all: allTime
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

/*
  GET /api/finance/history
  Historial financiero completo y comportamiento del usuario (todo el tiempo):
  evolución mensual, promedios, tasa de ahorro, récords, comercios frecuentes,
  patrón por día de la semana y gastos recurrentes (posibles suscripciones).
*/
router.get('/history', async (req, res) => {
  try {
    const userId = req.user._id;
    if (!isDbConnected()) {
      return res.status(503).json({ error: 'Servicio no disponible' });
    }

    const roundToTwo = (num) => Math.round(num * 100) / 100;
    const INCOME_TYPES = ['credit', 'deposit'];
    const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
    const monthLabel = (key) => {
      const [y, m] = key.split('-');
      return `${MONTH_LABELS[parseInt(m, 10) - 1]} ${y.slice(2)}`;
    };

    const transactions = await Transaction.find({
      userId,
      amount: { $gt: 0, $lte: MAX_TX_AMOUNT }
    });

    if (transactions.length === 0) {
      return res.json({ empty: true });
    }

    // ---- Totales y rango ----
    let totalIncome = 0;
    let totalSpending = 0;
    let firstDate = null;
    let lastDate = null;

    // ---- Acumuladores ----
    const byMonth = {};           // YYYY-MM -> { income, spending, count }
    const byCategory = {};        // categoria -> { amount, count } (solo gastos)
    const byMerchant = {};        // comercio -> { amount, count } (solo gastos)
    const byWeekday = [0, 0, 0, 0, 0, 0, 0]; // gasto total por día (0=domingo)
    const recurrenceMap = {};     // desc normalizada -> { name, months:Set, count, total }
    let biggestExpense = null;

    for (const t of transactions) {
      const amount = Math.abs(Number(t.amount)) || 0;
      const date = new Date(t.date);
      if (Number.isNaN(date.getTime()) || amount === 0) continue;

      if (!firstDate || date < firstDate) firstDate = date;
      if (!lastDate || date > lastDate) lastDate = date;

      const mk = monthKey(date);
      if (!byMonth[mk]) byMonth[mk] = { income: 0, spending: 0, count: 0 };
      byMonth[mk].count += 1;

      if (INCOME_TYPES.includes(t.type)) {
        totalIncome += amount;
        byMonth[mk].income += amount;
        continue;
      }

      // Gasto
      totalSpending += amount;
      byMonth[mk].spending += amount;
      byWeekday[date.getDay()] += amount;

      const category = t.category || 'unclassified';
      if (!byCategory[category]) byCategory[category] = { amount: 0, count: 0 };
      byCategory[category].amount += amount;
      byCategory[category].count += 1;

      const merchantName = (t.merchant || t.description || 'Otro').trim().slice(0, 40);
      if (!byMerchant[merchantName]) byMerchant[merchantName] = { amount: 0, count: 0 };
      byMerchant[merchantName].amount += amount;
      byMerchant[merchantName].count += 1;

      if (!biggestExpense || amount > biggestExpense.amount) {
        biggestExpense = {
          description: t.description || t.merchant || 'Gasto',
          amount: roundToTwo(amount),
          date: t.date,
          category
        };
      }

      const normalized = merchantName.toLowerCase().replace(/\s+/g, ' ');
      if (!recurrenceMap[normalized]) {
        recurrenceMap[normalized] = { name: merchantName, months: new Set(), count: 0, total: 0 };
      }
      recurrenceMap[normalized].months.add(mk);
      recurrenceMap[normalized].count += 1;
      recurrenceMap[normalized].total += amount;
    }

    // ---- Serie mensual ordenada ----
    const monthly = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({
        month: key,
        label: monthLabel(key),
        income: roundToTwo(v.income),
        spending: roundToTwo(v.spending),
        net: roundToTwo(v.income - v.spending),
        count: v.count
      }));

    const monthsActive = monthly.length;

    // ---- Récords mensuales ----
    const maxSpendingMonth = monthly.reduce((best, m) => (!best || m.spending > best.spending ? m : best), null);
    const bestNetMonth = monthly.reduce((best, m) => (!best || m.net > best.net ? m : best), null);

    // ---- Promedios y comportamiento ----
    const expenseCount = transactions.filter((t) => !INCOME_TYPES.includes(t.type)).length;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpending) / totalIncome) * 100 : null;

    const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const topWeekdayIndex = byWeekday.indexOf(Math.max(...byWeekday));
    const topWeekday = byWeekday[topWeekdayIndex] > 0
      ? { day: WEEKDAYS[topWeekdayIndex], amount: roundToTwo(byWeekday[topWeekdayIndex]) }
      : null;

    const topCategories = Object.entries(byCategory)
      .sort(([, a], [, b]) => b.amount - a.amount)
      .slice(0, 6)
      .map(([category, v]) => ({
        category,
        amount: roundToTwo(v.amount),
        count: v.count,
        percentage: totalSpending > 0 ? roundToTwo((v.amount / totalSpending) * 100) : 0
      }));

    const merchantEntries = Object.entries(byMerchant);
    const topMerchants = merchantEntries
      .sort(([, a], [, b]) => b.amount - a.amount)
      .slice(0, 5)
      .map(([name, v]) => ({ name, amount: roundToTwo(v.amount), count: v.count }));
    const frequentMerchant = merchantEntries
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 1)
      .map(([name, v]) => ({ name, count: v.count, amount: roundToTwo(v.amount) }))[0] || null;

    // Recurrentes: mismo comercio en 3+ meses distintos (posible suscripción/hábito)
    const recurring = Object.values(recurrenceMap)
      .filter((r) => r.months.size >= 3)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
      .map((r) => ({
        name: r.name,
        monthsSeen: r.months.size,
        count: r.count,
        total: roundToTwo(r.total),
        avgAmount: roundToTwo(r.total / r.count)
      }));

    res.json({
      empty: false,
      range: {
        from: firstDate,
        to: lastDate,
        monthsActive
      },
      totals: {
        income: roundToTwo(totalIncome),
        spending: roundToTwo(totalSpending),
        net: roundToTwo(totalIncome - totalSpending),
        transactionCount: transactions.length,
        expenseCount
      },
      averages: {
        monthlyIncome: roundToTwo(totalIncome / monthsActive),
        monthlySpending: roundToTwo(totalSpending / monthsActive),
        expenseTicket: expenseCount > 0 ? roundToTwo(totalSpending / expenseCount) : 0,
        savingsRate: savingsRate === null ? null : roundToTwo(savingsRate)
      },
      monthly,
      behavior: {
        biggestExpense,
        maxSpendingMonth,
        bestNetMonth,
        topWeekday,
        frequentMerchant,
        recurring
      },
      topCategories,
      topMerchants
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'No se pudo cargar el historial financiero' });
  }
});

// Get all transactions with filtering, sorting, and pagination
router.get('/transactions', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional({ checkFalsy: true }).isString().isIn(['date', 'amount', 'category']),
  query('sortOrder').optional({ checkFalsy: true }).isString().isIn(['asc', 'desc']),
  query('search').optional({ checkFalsy: true }).isString(),
  query('category').optional({ checkFalsy: true }).isString(),
  query('type').optional({ checkFalsy: true }).isString().isIn(['income', 'expense']),
  query('isAI').optional({ checkFalsy: true }).isBoolean(),
  query('startDate').optional({ checkFalsy: true }).isISO8601().toDate(),
  query('endDate').optional({ checkFalsy: true }).isISO8601().toDate()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const userId = req.user._id;

        // Check if the database is connected
        if (!isDbConnected()) {
            console.error('❌ Database not connected. Cannot fetch transactions.');
            return res.status(503).json({
                error: 'Servicio no disponible',
                message: 'La conexión con la base de datos no está disponible en este momento.'
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const sortBy = req.query.sortBy || 'date';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  let query = { userId, amount: { $gt: 0, $lte: MAX_TX_AMOUNT } };

        // Date range filter
        if (req.query.startDate || req.query.endDate) {
            query.date = {};
            if (req.query.startDate) {
                query.date.$gte = req.query.startDate;
            }
            if (req.query.endDate) {
                query.date.$lte = req.query.endDate;
            }
        }

        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            query.$or = [
                { description: searchRegex },
                { category: searchRegex },
                { notes: searchRegex }
            ];
        }

        if (req.query.category) {
            query.category = req.query.category;
        }

        if (req.query.type) {
            if (req.query.type === 'income') {
                query.type = { $in: ['income', 'deposit', 'credit'] };
            } else { // expense
                query.type = { $in: ['expense', 'debit', 'payment', 'withdrawal'] };
            }
        }

        if (req.query.isAI) {
            query.isAI = req.query.isAI === 'true';
        }

    const totalCount = await Transaction.countDocuments(query);
        const transactions = await Transaction.find(query)
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limit);

        res.json({
            transactions,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                totalCount,
                hasNext: page * limit < totalCount,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Internal Server Error' });
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

    // Check if it's a demo user - return demo data only when explicitly allowed
    if (ALLOW_DEMO_MODE && userId === 'demo-user-id') {
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

    // Aggregate spending by category (filtrar montos irreales)
    const categorySpending = await Transaction.aggregate([
      {
        $match: {
          userId: userId,
          type: { $in: ['debit', 'payment', 'withdrawal'] },
          amount: { $gt: 0, $lte: MAX_TX_AMOUNT },
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

    // Check if it's a demo user - return demo data only when explicitly allowed
    if (ALLOW_DEMO_MODE && userId === 'demo-user-id') {
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

    // Check if it's a demo user - return demo data only when explicitly allowed
    if (ALLOW_DEMO_MODE && userId === 'demo-user-id') {
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
      type: { $in: ['credit', 'deposit'] },
      amount: { $gt: 0, $lte: MAX_TX_AMOUNT }
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

// Lista de movimientos sin clasificar (para resolverlos desde el dashboard)
router.get('/unclassified', async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const transactions = await Transaction.find({ userId, category: 'unclassified' })
      .sort({ date: -1 })
      .limit(limit);
    res.json({ transactions, count: transactions.length });
  } catch (error) {
    console.error('Unclassified list error:', error);
    res.status(500).json({ error: 'Failed to load unclassified transactions' });
  }
});

module.exports = router;
