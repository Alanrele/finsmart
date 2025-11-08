/**
 * @interface AIAnalyzerPort
 * Defines the contract for any AI analysis provider used by the application layer.
 */
class AIAnalyzerPort {
  isAvailable() {
    throw new Error('AIAnalyzerPort.isAvailable must be implemented');
  }

  generateFinancialAnalysis() {
    throw new Error('AIAnalyzerPort.generateFinancialAnalysis must be implemented');
  }

  generateChatResponse() {
    throw new Error('AIAnalyzerPort.generateChatResponse must be implemented');
  }

  generateSpendingInsights() {
    throw new Error('AIAnalyzerPort.generateSpendingInsights must be implemented');
  }

  generateRecommendations() {
    throw new Error('AIAnalyzerPort.generateRecommendations must be implemented');
  }

  predictSpending() {
    throw new Error('AIAnalyzerPort.predictSpending must be implemented');
  }

  categorizeTransaction() {
    throw new Error('AIAnalyzerPort.categorizeTransaction must be implemented');
  }
}

module.exports = AIAnalyzerPort;
