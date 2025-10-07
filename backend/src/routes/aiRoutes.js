const express = require('express');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/transactionModel');
const aiAnalysisService = require('../services/aiAnalysisService');

const router = express.Router();

// Analyze financial data
router.post('/analyze', async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if it's a demo user - return demo data
    if (userId === 'demo-user-id' || userId === 'microsoft-user-id') {
      console.log('🎭 Returning demo AI analysis data');
      return res.json({
        analysis: {
          insights: [
            "Tu gasto en comida representa el 37.5% de tus gastos totales, lo cual está dentro del rango recomendado.",
            "Has incrementado tus gastos en transporte en un 15% comparado con el mes anterior.",
            "Tus ahorros actuales son excelentes, representan el 79.6% de tus ingresos mensuales."
          ],
          recommendations: [
            "Considera usar apps de descuentos para optimizar tus compras de comida.",
            "Evalúa opciones de transporte público para reducir gastos en movilidad.",
            "Mantén tu excelente hábito de ahorro, estás por encima del promedio."
          ],
          score: 8.5,
          period: req.body.period || 'month',
          category: req.body.category || 'all'
        },
        metadata: {
          totalTransactions: 28,
          categoriesAnalyzed: 6,
          confidenceLevel: 0.92
        }
      });
    }

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

    // Check if it's a demo user - return demo data
    if (userId === 'demo-user-id' || userId === 'microsoft-user-id') {
      console.log('🎭 Returning demo AI chat response');
      const demoResponses = [
        "Como asistente financiero, veo que tienes excelentes hábitos de ahorro. Tu balance actual de $15,750.50 muestra una gestión responsable.",
        "Basándome en tus transacciones, recomiendo mantener el control en gastos de entretenimiento. Actualmente representan el 13.1% de tus gastos.",
        "Tus ingresos de $8,500 mensuales te permiten tener un buen margen para inversiones. ¿Has considerado diversificar tu portafolio?",
        "Observo que tu categoría de mayor gasto es comida con $1,200.50. Esto está dentro del rango saludable del 30-40% de gastos totales."
      ];

      const randomResponse = demoResponses[Math.floor(Math.random() * demoResponses.length)];

      return res.json({
        response: randomResponse,
        confidence: 0.89,
        suggestions: [
          "Revisar gastos mensuales por categoría",
          "Establecer metas de ahorro",
          "Analizar tendencias de gastos"
        ]
      });
    }

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

    // Check if it's a demo user - return demo data
    if (userId === 'demo-user-id' || userId === 'microsoft-user-id') {
      console.log('🎭 Returning demo AI insights data');
      return res.json({
        message: 'Spending insights generated',
        insights: {
          trends: [
            {
              category: 'Food',
              trend: 'stable',
              change: 2.5,
              recommendation: 'Mantén el control en gastos de alimentación'
            },
            {
              category: 'Transportation',
              trend: 'increasing',
              change: 15.3,
              recommendation: 'Considera opciones de transporte más económicas'
            },
            {
              category: 'Entertainment',
              trend: 'decreasing',
              change: -8.7,
              recommendation: 'Buen control en gastos de entretenimiento'
            }
          ],
          alerts: [
            {
              type: 'budget_exceeded',
              category: 'Transportation',
              message: 'Has excedido tu presupuesto de transporte en un 15%'
            }
          ],
          score: 8.2,
          tips: [
            'Considera usar aplicaciones de descuentos para comida',
            'Evalúa opciones de transporte público',
            'Mantén tu excelente control en entretenimiento'
          ]
        },
        period: `${req.query.months || 3} months`
      });
    }

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

    // Check if it's a demo user - return demo data
    if (userId === 'demo-user-id' || userId === 'microsoft-user-id') {
      console.log('🎭 Returning demo AI recommendations data');
      return res.json({
        message: 'Financial recommendations generated',
        recommendations: [
          {
            type: 'savings',
            priority: 'high',
            title: 'Optimiza tus ahorros',
            description: 'Con tu excelente tasa de ahorro del 79.6%, considera invertir parte en instrumentos de mayor rendimiento.',
            action: 'Explora opciones de inversión a mediano plazo',
            potential_impact: 'Incremento del 15-25% en rendimientos anuales'
          },
          {
            type: 'spending',
            priority: 'medium',
            title: 'Control de gastos en transporte',
            description: 'Tus gastos en transporte han aumentado 15% este mes.',
            action: 'Considera usar transporte público o apps de movilidad compartida',
            potential_impact: 'Ahorro de hasta $150 mensuales'
          },
          {
            type: 'budget',
            priority: 'low',
            title: 'Mantén hábitos alimentarios',
            description: 'Tus gastos en comida están bien controlados dentro del 37.5% del presupuesto.',
            action: 'Continúa con tus hábitos actuales',
            potential_impact: 'Estabilidad financiera sostenida'
          }
        ],
        score: 8.5,
        next_review: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

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

    // Check if it's a demo user - return demo data
    if (userId === 'demo-user-id' || userId === 'microsoft-user-id') {
      console.log('🎭 Returning demo AI prediction data');
      return res.json({
        message: 'Spending prediction generated',
        prediction: {
          totalSpending: 3350.25,
          categories: {
            Food: { predicted: 1280.75, confidence: 0.89, trend: 'stable' },
            Transportation: { predicted: 650.50, confidence: 0.76, trend: 'increasing' },
            Entertainment: { predicted: 390.20, confidence: 0.84, trend: 'decreasing' },
            Utilities: { predicted: 385.40, confidence: 0.95, trend: 'stable' },
            Shopping: { predicted: 340.80, confidence: 0.72, trend: 'variable' },
            Others: { predicted: 302.60, confidence: 0.68, trend: 'stable' }
          },
          confidence: 0.81,
          factors: [
            'Tendencia histórica de gastos',
            'Patrones estacionales detectados',
            'Cambios recientes en hábitos de gasto'
          ],
          recommendations: [
            'Presupuesta $650 para transporte basado en tendencia creciente',
            'Mantén control en entretenimiento, tendencia positiva',
            'Considera ajustar presupuesto de compras por variabilidad'
          ]
        },
        period: 'next_month'
      });
    }

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

    // Check if it's a demo user - return demo data
    if (userId === 'demo-user-id' || userId === 'microsoft-user-id') {
      console.log('🎭 Returning demo AI categorization data');
      return res.json({
        message: 'Transaction categorization completed',
        categorized: [
          {
            transactionId: 'demo-trans-1',
            originalCategory: 'Unknown',
            suggestedCategory: 'Food',
            confidence: 0.92,
            description: 'Supermercado Central'
          },
          {
            transactionId: 'demo-trans-2',
            originalCategory: 'Unknown',
            suggestedCategory: 'Transportation',
            confidence: 0.87,
            description: 'Pago Uber'
          },
          {
            transactionId: 'demo-trans-3',
            originalCategory: 'Unknown',
            suggestedCategory: 'Entertainment',
            confidence: 0.84,
            description: 'Netflix Subscription'
          }
        ],
        totalCategorized: 3,
        averageConfidence: 0.88,
        processingTime: '1.2s'
      });
    }

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
