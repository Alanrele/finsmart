// Modo offline para desarrollo y fallback
export const createOfflineMode = () => {
  console.log('🔧 Activando modo offline/demo');

  // Mock data para el dashboard
  const mockDashboardData = {
    totalBalance: 15750.50,
    monthlyIncome: 8500.00,
    monthlyExpenses: 3200.75,
    totalSavings: 12549.75,
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
      }
    ]
  };

  const mockTransactions = [
    ...mockDashboardData.recentTransactions,
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
  ];

  const mockAIInsights = {
    recommendations: [
      'Considera reducir gastos en entretenimiento este mes',
      'Tu patrón de ahorro está mejorando significativamente',
      'Podrías optimizar gastos de alimentación planificando compras'
    ],
    analysis: {
      spendingPattern: 'stable',
      savingsRate: 0.62,
      categoryBreakdown: {
        food: 35,
        utilities: 15,
        entertainment: 12,
        transportation: 18,
        others: 20
      }
    }
  };

  // Override API calls with mock data
  const originalFetch = window.fetch;
  window.fetch = async (url, options) => {
    console.log('🎭 Intercepting API call:', url);

    // Verificar si hay un token válido - si lo hay, intentar la llamada real primero
    const hasValidToken = localStorage.getItem('auth-storage') &&
                         !localStorage.getItem('auth-storage').includes('demo-token');

    if (hasValidToken && !url.includes('/health')) {
      console.log('🔑 Valid token found, trying real API first...');
      try {
        const response = await originalFetch(url, options);
        if (response.ok) {
          console.log('✅ Real API call succeeded, using real data');
          return response;
        }
        console.log('⚠️ Real API failed, falling back to mock data');
      } catch (error) {
        console.log('❌ Real API error, falling back to mock data:', error.message);
      }
    }

    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 500));    if (url.includes('/api/finance/dashboard')) {
      return new Response(JSON.stringify(mockDashboardData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.includes('/api/finance/transactions')) {
      return new Response(JSON.stringify({
        transactions: mockTransactions,
        total: mockTransactions.length,
        page: 1,
        pages: 1
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.includes('/api/ai/')) {
      return new Response(JSON.stringify(mockAIInsights), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.includes('/health')) {
      return new Response(JSON.stringify({
        status: 'OFFLINE_MODE',
        message: 'Running in offline demo mode'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Para otras llamadas, usar fetch original
    try {
      return await originalFetch(url, options);
    } catch (error) {
      console.warn('API call failed, returning demo response:', error);
      return new Response(JSON.stringify({ error: 'Offline mode active' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };

  return {
    isOffline: true,
    mockData: {
      dashboard: mockDashboardData,
      transactions: mockTransactions,
      aiInsights: mockAIInsights
    }
  };
};

export const disableOfflineMode = () => {
  // Restaurar fetch original si está guardado
  if (window.originalFetch) {
    window.fetch = window.originalFetch;
    delete window.originalFetch;
  }
  console.log('🌐 Modo offline desactivado');
};
