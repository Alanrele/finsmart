const AIAnalyzerPort = require('../../ports/ai/AIAnalyzerPort');

/**
 * Factory that wires AI analysis use cases with a concrete analyzer implementation.
 * @param {Object} deps
 * @param {AIAnalyzerPort} deps.aiAnalyzer
 */
function createAIAnalysisUseCases({ aiAnalyzer }) {
  if (!aiAnalyzer || !(aiAnalyzer instanceof AIAnalyzerPort || typeof aiAnalyzer.generateFinancialAnalysis === 'function')) {
    throw new Error('createAIAnalysisUseCases requires a valid aiAnalyzer implementing AIAnalyzerPort');
  }

  return {
    isAvailable: () => aiAnalyzer.isAvailable(),
    generateFinancialAnalysis: (transactions, period) =>
      aiAnalyzer.generateFinancialAnalysis(transactions, period),
    generateChatResponse: (message, recentTransactions) =>
      aiAnalyzer.generateChatResponse(message, recentTransactions),
    generateSpendingInsights: (trends, monthlyData) =>
      aiAnalyzer.generateSpendingInsights(trends, monthlyData),
    generateRecommendations: (transactions) =>
      aiAnalyzer.generateRecommendations(transactions),
    predictSpending: (transactions) =>
      aiAnalyzer.predictSpending(transactions),
    categorizeTransaction: (rawText) =>
      aiAnalyzer.categorizeTransaction(rawText),
  };
}

module.exports = createAIAnalysisUseCases;
