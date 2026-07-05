import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  MessageCircle,
  Send,
  Mic,
  MicOff,
  Sparkles,
  TrendingUp,
  Target,
  Lightbulb,
  AlertTriangle,
  PiggyBank,
  Calculator,
  Calendar,
  DollarSign
} from 'lucide-react';
import { chatWithAI, getFinancialRecommendations, getFinancialInsights, analyzeFinancialData } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import toast from 'react-hot-toast';

const EnhancedAIAssistant = () => {
  const [messages, setMessages] = useState<any[]>([ // TODO: tipar (mensajes del asistente)
    {
      type: 'ai',
      content: '¡Hola! Soy tu asistente financiero inteligente. Puedo ayudarte con:',
      suggestions: [
        '¿Cuál es mi balance este mes?',
        'Analiza mis gastos',
        'Dame recomendaciones',
        'Predice mi gasto del próximo mes'
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Scroll to bottom cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Web Speech API para voz
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast.error('Error al reconocer voz');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error('Tu navegador no soporta reconocimiento de voz');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast.success('Escuchando... Habla ahora');
    }
  };

  const sendMessage = async (messageText = input) => {
    if (!messageText.trim()) return;

    const userMessage = { type: 'user', content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setShowQuickActions(false);

    try {
      const response = await chatWithAI({ message: messageText });

      const aiMessage = {
        type: 'ai',
        content: response.response,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Si hay sugerencias de seguimiento
      if (response.suggestions && response.suggestions.length > 0) {
        const suggestionsMessage = {
          type: 'ai',
          suggestions: response.suggestions
        };
        setMessages((prev) => [...prev, suggestionsMessage]);
      }
    } catch (error) {
      const errorMessage = {
        type: 'ai',
        content: 'Lo siento, hubo un error al procesar tu pregunta. Por favor intenta de nuevo.',
        isError: true
      };
      setMessages((prev) => [...prev, errorMessage]);
      toast.error('Error al comunicarse con el asistente');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action) => {
    setLoading(true);
    setShowQuickActions(false);

    try {
      let response;
      let aiMessage;

      switch (action) {
        case 'analyze':
          response = await analyzeFinancialData({ period: 'month' });
          aiMessage = {
            type: 'ai',
            content: response.analysis.summary,
            insights: response.analysis.insights,
            recommendations: response.analysis.recommendations
          };
          break;

        case 'recommendations':
          response = await getFinancialRecommendations();
          aiMessage = {
            type: 'ai',
            content: 'Aquí están tus recomendaciones personalizadas:',
            recommendations: response.recommendations
          };
          break;

        case 'insights':
          response = await getFinancialInsights({ months: 3 });
          aiMessage = {
            type: 'ai',
            content: 'Insights de tus últimos 3 meses:',
            insights: response.insights.trends || []
          };
          break;

        case 'predict':
          sendMessage('¿Cuánto gastaré el próximo mes?');
          return;

        default:
          return;
      }

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      toast.error('Error al cargar la información');
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      id: 'analyze',
      icon: Brain,
      title: 'Analizar Finanzas',
      description: 'Análisis completo de tu situación financiera',
      color: 'from-primary to-primary-700'
    },
    {
      id: 'recommendations',
      icon: Lightbulb,
      title: 'Recomendaciones',
      description: 'Consejos personalizados para mejorar',
      color: 'from-sage-600 to-primary'
    },
    {
      id: 'insights',
      icon: TrendingUp,
      title: 'Insights',
      description: 'Patrones y tendencias en tus gastos',
      color: 'from-primary to-primary-700'
    },
    {
      id: 'predict',
      icon: Calculator,
      title: 'Predicción',
      description: 'Estima tus gastos futuros',
      color: 'from-sage-600 to-primary'
    }
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-primary text-white p-6 rounded-t-2xl">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Asistente Financiero IA</h2>
            <p className="text-white/80 text-sm">Powered by OpenAI GPT-4</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700"
          >
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">Acciones rápidas:</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.id)}
                  disabled={loading}
                  className="group relative min-w-0 p-4 bg-white dark:bg-zinc-700 rounded-xl border border-zinc-200 dark:border-zinc-600 hover:shadow-lg transition-all overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <action.icon className={`w-6 h-6 mb-2 text-zinc-700 dark:text-zinc-300 group-hover:text-primary-600 transition-colors`} />
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white break-words">
                    {action.title}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 break-words">
                    {action.description}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50 dark:bg-zinc-900">
        {messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type === 'user' ? (
              <div className="max-w-[70%] bg-primary text-white px-4 py-3 rounded-2xl rounded-tr-none">
                <p>{message.content}</p>
              </div>
            ) : (
              <div className="max-w-[85%] space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-gradient-to-br from-primary to-sage-600 rounded-full flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 bg-white dark:bg-zinc-800 px-4 py-3 rounded-2xl rounded-tl-none shadow-md">
                    {message.content && (
                      <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}

                    {/* Insights */}
                    {message.insights && message.insights.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-semibold text-primary dark:text-primary-300 flex items-center">
                          <Lightbulb className="w-4 h-4 mr-2" />
                          Insights:
                        </p>
                        {message.insights.map((insight, i) => (
                          <div key={i} className="pl-4 border-l-2 border-primary text-sm text-zinc-700 dark:text-zinc-300">
                            {insight}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Recommendations */}
                    {message.recommendations && message.recommendations.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-semibold text-sage-700 dark:text-sage-300 flex items-center">
                          <Target className="w-4 h-4 mr-2" />
                          Recomendaciones:
                        </p>
                        {message.recommendations.map((rec, i) => (
                          <div
                            key={i}
                            className="p-3 bg-primary/10 dark:bg-primary/20 rounded-xl border border-primary/20 dark:border-primary/40"
                          >
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {rec.title || rec}
                            </p>
                            {rec.description && (
                              <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1">
                                {rec.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Suggestions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, i) => (
                          <button
                            key={i}
                            onClick={() => sendMessage(suggestion)}
                            className="text-xs px-3 py-1.5 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-300 border border-primary/20 rounded-full hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}

                    {message.timestamp && (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ))}

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-primary-500 to-purple-500 rounded-full">
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div className="bg-white dark:bg-zinc-800 px-4 py-3 rounded-2xl shadow-md">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 rounded-b-xl">
        {isListening && (
          <div className="mb-3 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" />
              <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm text-red-700 dark:text-red-300 font-medium">
              Escuchando... Habla ahora
            </span>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleVoiceInput}
            disabled={loading}
            className={`p-3 rounded-lg transition-all ${
              isListening
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/50'
                : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-primary/10 dark:hover:bg-primary/20'
            }`}
            title={isListening ? 'Detener grabación' : 'Usar voz (Chrome/Edge)'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            disabled={loading}
            placeholder="Pregúntame sobre tus finanzas..."
            className="flex-1 min-w-0 px-4 py-3 bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          />

          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="p-3 bg-primary hover:bg-primary-600 active:bg-primary-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/15"
            title="Enviar mensaje"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 text-center">
          Powered by OpenAI • Tus datos están seguros
        </p>
      </div>
    </div>
  );
};

export default EnhancedAIAssistant;
