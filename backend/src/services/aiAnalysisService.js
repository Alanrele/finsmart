const OpenAI = require('openai');

class AIAnalysisService {
  constructor() {
    this.openai = null;
    this.isInitialized = false;
    this.initialize().then(() => {
      this.isInitialized = true;
    }).catch(error => {
      console.error('❌ AI service initialization failed:', error);
      this.isInitialized = true; // Mark as initialized even if failed
    });
  }

  async initialize() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey === 'your-openai-api-key-here' || apiKey.length < 20) {
      console.log('⚠️ OpenAI API key not properly configured. Using fallback analysis only.');
      return;
    }

    // Check if API key looks valid (should start with sk- and be reasonable length)
    if (!apiKey.startsWith('sk-')) {
      console.log('⚠️ OpenAI API key format invalid. Using fallback analysis only.');
      return;
    }

    try {
      this.openai = new OpenAI({
        apiKey: apiKey
      });

      // Test the API key with a minimal request
      try {
        await this.openai.models.list();
        console.log('✅ OpenAI service initialized and API key validated');
      } catch (testError) {
        if (testError.status === 401) {
          console.error('❌ OpenAI API key is invalid or expired. Please update OPENAI_API_KEY in .env file');
          console.error('   Get a new API key from: https://platform.openai.com/account/api-keys');
          this.openai = null;
        } else {
          console.warn('⚠️ OpenAI API key validation failed, but service will continue:', testError.message);
        }
      }

    } catch (error) {
      console.warn('⚠️ Failed to initialize OpenAI service. Using fallback analysis only.', error.message);
      this.openai = null;
    }
  }

  isOpenAIAvailable() {
    return this.openai !== null && this.isInitialized;
  }

  handleOpenAIError(error, operation = 'OpenAI operation') {
    if (error.status === 401) {
      console.error(`❌ ${operation} failed: Invalid or expired OpenAI API key`);
      console.error('   Please update OPENAI_API_KEY in .env file');
      console.error('   Get a new API key from: https://platform.openai.com/account/api-keys');

      // Disable OpenAI service for future requests
      this.openai = null;

      throw new Error(`OpenAI authentication failed: API key is invalid or expired`);
    } else if (error.status === 429) {
      console.warn(`⚠️ ${operation} failed: Rate limit exceeded`);
      throw new Error(`OpenAI rate limit exceeded. Please try again later.`);
    } else if (error.status === 503) {
      console.warn(`⚠️ ${operation} failed: OpenAI service unavailable`);
      throw new Error(`OpenAI service is temporarily unavailable. Please try again later.`);
    } else {
      console.error(`❌ ${operation} failed:`, error.message);
      throw new Error(`${operation} failed: ${error.message}`);
    }
  }

  async extractTransactionData(emailContent) {
    if (!this.isOpenAIAvailable()) {
      throw new Error('OpenAI service not available');
    }

    try {
      const prompt = `
Analiza el siguiente contenido de un correo electrónico del Banco de Crédito del Perú (BCP) y extrae la información de la transacción financiera.

Contenido del correo:
${emailContent}

Devuelve SOLO un objeto JSON válido con la siguiente estructura:
{
  "amount": número (monto absoluto de la transacción),
  "type": "debit" | "credit" | "transfer" | "payment" | "withdrawal" | "deposit",
  "category": "food" | "transport" | "entertainment" | "shopping" | "healthcare" | "utilities" | "education" | "travel" | "investment" | "income" | "transfer" | "other",
  "subcategory": string (opcional),
  "merchant": string (nombre del comercio o entidad),
  "description": string (descripción de la transacción),
  "channel": "online" | "atm" | "pos" | "mobile" | "branch" | "other",
  "operationNumber": string (opcional),
  "cardNumber": string (últimos 4 dígitos si está disponible),
  "date": string (formato ISO 8601),
  "balance": número (opcional),
  "location": string (opcional),
  "confidence": número (0-1, confianza en la extracción)
}

Si no puedes extraer información válida, devuelve null.
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en análisis de transacciones bancarias del BCP en Perú. Extrae información precisa de correos electrónicos bancarios.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const content = response.choices[0].message.content.trim();

      // Clean the response to ensure it's valid JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log('No valid JSON found in AI response');
        return null;
      }

      const transactionData = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!transactionData.amount || isNaN(transactionData.amount)) {
        console.log('Invalid or missing amount in transaction data');
        return null;
      }

      return transactionData;

    } catch (error) {
      console.error('AI transaction extraction error:', error);
      this.handleOpenAIError(error, 'Transaction extraction');
    }
  }

  async generateFinancialAnalysis(transactions, period = 'month') {
    if (!this.isOpenAIAvailable()) {
      throw new Error('OpenAI service not initialized');
    }

    try {
      // Prepare transaction summary for AI
      const transactionSummary = this.prepareTransactionSummary(transactions);

      const prompt = `
Analiza las siguientes transacciones financieras de un usuario y genera un análisis financiero completo.

Datos de transacciones (${period}):
${JSON.stringify(transactionSummary, null, 2)}

Genera un análisis que incluya:
1. Resumen financiero general
2. Patrones de gasto identificados
3. Categorías de mayor consumo
4. Recomendaciones específicas de ahorro
5. Insights sobre hábitos financieros
6. Proyección y tendencias

Devuelve un objeto JSON con esta estructura:
{
  "summary": "string (resumen ejecutivo del análisis)",
  "insights": ["array de insights importantes"],
  "recommendations": ["array de recomendaciones específicas"],
  "spending": {
    "total": número,
    "categories": [{"category": "string", "amount": número, "percentage": número}]
  },
  "trends": ["array de tendencias identificadas"],
  "score": número (1-10, calificación del estado financiero),
  "warnings": ["array de alertas o preocupaciones"]
}
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un asesor financiero experto especializado en análisis de gastos personales en Perú. Proporciona consejos prácticos y específicos.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const content = response.choices[0].message.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('Invalid AI response format');
      }

      return JSON.parse(jsonMatch[0]);

    } catch (error) {
      console.error('AI financial analysis error:', error);
      throw new Error(`Failed to generate financial analysis: ${error.message}`);
    }
  }

  async generateChatResponse(userMessage, transactions) {
    if (!this.isOpenAIAvailable()) {
      throw new Error('OpenAI service not initialized');
    }

    try {
      // Prepare transaction context
      const transactionContext = this.prepareTransactionSummary(transactions.slice(0, 20));

  const prompt = `
Eres un asistente financiero personal especializado en análisis de gastos.

Contexto de transacciones del usuario:
${JSON.stringify(transactionContext, null, 2)}

Pregunta del usuario: ${userMessage}

Formato y reglas obligatorias al responder:
- No uses markdown ni asteriscos (**), subrayados (__), ni bloques de código.
- Cuando menciones montos en soles peruanos, usa siempre el formato: S/ 1,234.56 (es-PE: coma para miles, punto para decimales).
- No mezcles símbolos (no escribas $ junto a S/). Para USD, usa US$ 1,234.56.
- Si no estás absolutamente seguro de un valor, no lo inventes: di que no hay suficientes datos.
- Sé breve y directo. Si el usuario pidió un cálculo, muéstralo claro con 2 decimales.

Responde de forma conversacional y útil. Usa los datos de transacciones para dar respuestas específicas y personalizadas. Si no tienes suficiente información, menciona qué datos adicionales serían útiles.
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente financiero personal experto, amigable y útil. Ayudas a los usuarios a entender sus gastos y tomar mejores decisiones financieras.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1000
      });

      return response.choices[0].message.content.trim();

    } catch (error) {
      console.error('AI chat response error:', error);
      throw new Error(`Failed to generate chat response: ${error.message}`);
    }
  }

  async generateSpendingInsights(trends, monthlyData) {
    if (!this.isOpenAIAvailable()) {
      throw new Error('OpenAI service not initialized');
    }

    try {
      const prompt = `
Analiza las siguientes tendencias de gasto y datos mensuales para generar insights útiles.

Tendencias de gasto:
${JSON.stringify(trends, null, 2)}

Datos del mes actual:
${JSON.stringify(monthlyData, null, 2)}

Genera insights específicos sobre:
1. Cambios en patrones de gasto
2. Categorías con mayor crecimiento/reducción
3. Oportunidades de ahorro identificadas
4. Comparaciones mes a mes
5. Predicciones basadas en tendencias

Devuelve un array de strings con insights concretos y accionables.
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un analista financiero experto en identificar patrones y tendencias de gasto personal.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 1000
      });

      const content = response.choices[0].message.content.trim();

      // Try to parse as JSON array, otherwise split by lines
      try {
        return JSON.parse(content);
      } catch {
        return content.split('\n').filter(line => line.trim().length > 0);
      }

    } catch (error) {
      console.error('AI spending insights error:', error);
      throw new Error(`Failed to generate spending insights: ${error.message}`);
    }
  }

  async generateRecommendations(transactions) {
    if (!this.isOpenAIAvailable()) {
      throw new Error('OpenAI service not initialized');
    }

    try {
      const transactionSummary = this.prepareTransactionSummary(transactions);

      const prompt = `
Basándote en las siguientes transacciones, genera recomendaciones financieras personalizadas y específicas.

Transacciones:
${JSON.stringify(transactionSummary, null, 2)}

Genera recomendaciones que incluyan:
1. Acciones específicas para reducir gastos
2. Optimización de categorías de gasto
3. Estrategias de ahorro personalizadas
4. Cambios de hábitos sugeridos
5. Oportunidades de inversión simples

Devuelve un array de objetos con esta estructura:
[
  {
    "title": "string (título de la recomendación)",
    "description": "string (descripción detallada)",
    "category": "string (categoría afectada)",
    "impact": "high" | "medium" | "low",
    "effort": "easy" | "moderate" | "difficult",
    "savings": número (ahorro potencial estimado)
  }
]
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un asesor financiero personal que proporciona recomendaciones prácticas y específicas para mejorar la salud financiera.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const content = response.choices[0].message.content.trim();
      const jsonMatch = content.match(/\[[\s\S]*\]/);

      if (!jsonMatch) {
        throw new Error('Invalid AI response format');
      }

      return JSON.parse(jsonMatch[0]);

    } catch (error) {
      console.error('AI recommendations error:', error);
      throw new Error(`Failed to generate recommendations: ${error.message}`);
    }
  }

  async predictSpending(transactions) {
    if (!this.isOpenAIAvailable()) {
      throw new Error('OpenAI service not initialized');
    }

    try {
      const transactionSummary = this.prepareTransactionSummary(transactions);

      const prompt = `
Analiza las siguientes transacciones históricas y predice el gasto del próximo mes.

Transacciones históricas (últimos 6 meses):
${JSON.stringify(transactionSummary, null, 2)}

Genera una predicción que incluya:
1. Gasto total estimado del próximo mes
2. Predicción por categorías
3. Factores que podrían afectar el gasto
4. Nivel de confianza de la predicción
5. Recomendaciones para mantenerse dentro del presupuesto

Devuelve un objeto JSON con esta estructura:
{
  "totalPredicted": número,
  "confidence": número (0-1),
  "categories": [{"category": "string", "predicted": número, "variance": número}],
  "factors": ["factores que afectan la predicción"],
  "recommendations": ["recomendaciones para controlar el gasto"],
  "budgetSuggestion": número
}
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un analista financiero experto en predicción de gastos y planificación presupuestaria.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1200
      });

      const content = response.choices[0].message.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('Invalid AI response format');
      }

      return JSON.parse(jsonMatch[0]);

    } catch (error) {
      console.error('AI spending prediction error:', error);
      throw new Error(`Failed to predict spending: ${error.message}`);
    }
  }

  async categorizeTransaction(rawText) {
    if (!this.isOpenAIAvailable()) {
      throw new Error('OpenAI service not initialized');
    }

    try {
      const prompt = `
Analiza el siguiente texto de una transacción bancaria y determina su categoría.

Texto de la transacción: ${rawText}

Devuelve SOLO un objeto JSON con esta estructura:
{
  "category": "food" | "transport" | "entertainment" | "shopping" | "healthcare" | "utilities" | "education" | "travel" | "investment" | "income" | "transfer" | "other",
  "subcategory": "string (opcional, más específico)",
  "merchant": "string (nombre del comercio si está identificable)",
  "confidence": número (0-1)
}
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en categorización de transacciones bancarias en Perú. Clasifica con precisión el tipo de gasto.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      });

      const content = response.choices[0].message.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return { category: 'other', confidence: 0.1 };
      }

      return JSON.parse(jsonMatch[0]);

    } catch (error) {
      console.error('AI categorization error:', error);
      return { category: 'other', confidence: 0.1 };
    }
  }

  prepareTransactionSummary(transactions) {
    if (!transactions || transactions.length === 0) {
      return { message: 'No transactions available' };
    }

    // Group by category and calculate totals
    const categoryTotals = {};
    let totalAmount = 0;
    const recentTransactions = [];

    transactions.forEach(transaction => {
      // Category totals
      if (!categoryTotals[transaction.category]) {
        categoryTotals[transaction.category] = {
          amount: 0,
          count: 0,
          transactions: []
        };
      }

      categoryTotals[transaction.category].amount += transaction.amount;
      categoryTotals[transaction.category].count += 1;

      if (categoryTotals[transaction.category].transactions.length < 3) {
        categoryTotals[transaction.category].transactions.push({
          amount: transaction.amount,
          description: transaction.description,
          date: transaction.date,
          merchant: transaction.merchant
        });
      }

      totalAmount += transaction.amount;

      // Recent transactions (last 10)
      if (recentTransactions.length < 10) {
        recentTransactions.push({
          amount: transaction.amount,
          category: transaction.category,
          description: transaction.description,
          date: transaction.date,
          type: transaction.type
        });
      }
    });

    return {
      totalAmount,
      transactionCount: transactions.length,
      categoryTotals,
      recentTransactions,
      period: {
        from: transactions[transactions.length - 1]?.date,
        to: transactions[0]?.date
      }
    };
  }

  isAvailable() {
    return this.openai !== null;
  }
}

module.exports = new AIAnalysisService();
