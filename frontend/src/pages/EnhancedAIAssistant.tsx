import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AssistantMessage } from '../types';
import {
  Brain,
  Send,
  Mic,
  MicOff,
  Sparkles,
  TrendingUp,
  Target,
  Lightbulb,
  Calculator,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { chatWithAI, getFinancialRecommendations, getFinancialInsights, analyzeFinancialData } from '../services/api';
import { PageHeader } from '../components/ui/kit';
import { PlatinumBadge } from '../components/premium/PremiumGate';
import toast from 'react-hot-toast';

/*
  Asistente IA+ (Platinum) — estilo Kipu y robustez:
  - cada error deja un mensaje claro con botón "Reintentar" (se recuerda la
    última acción fallida); un 403 explica que el acceso Platinum terminó
  - las acciones rápidas y el chat comparten los mismos estados de carga
  - entrada por voz opcional (Web Speech API) con degradación limpia
*/

const QUICK_ACTIONS = [
  { id: 'analyze', icon: Brain, title: 'Analizar finanzas', description: 'Análisis completo del mes' },
  { id: 'recommendations', icon: Lightbulb, title: 'Recomendaciones', description: 'Consejos personalizados' },
  { id: 'insights', icon: TrendingUp, title: 'Tendencias', description: 'Patrones de tus últimos 3 meses' },
  { id: 'predict', icon: Calculator, title: 'Predicción', description: 'Estima tu gasto del próximo mes' },
];

const WELCOME: AssistantMessage = {
  type: 'ai',
  content: 'Hola, soy tu asistente financiero. Analizo tus movimientos reales para responderte. ¿Qué quieres saber?',
  suggestions: [
    '¿Cuál es mi balance este mes?',
    '¿En qué gasté más esta semana?',
    'Dame recomendaciones de ahorro',
  ],
};

const EnhancedAIAssistant = () => {
  const [messages, setMessages] = useState<AssistantMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  // Última acción fallida, para el botón Reintentar
  const lastActionRef = useRef<null | (() => void)>(null);
  const messagesEndRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Entrada por voz (opcional; si el navegador no la soporta, se degrada)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'es-PE';
    rec.onresult = (event) => {
      setInput(event.results[0][0].transcript);
      setIsListening(false);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    return () => rec.abort?.();
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error('Tu navegador no soporta dictado por voz');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const pushError = useCallback((err: any, retry: () => void) => {
    lastActionRef.current = retry;
    const is403 = err?.response?.status === 403;
    setMessages((prev) => [
      ...prev,
      {
        type: 'ai',
        isError: true,
        content: is403
          ? 'Tu acceso Platinum terminó, así que no puedo consultar la IA. Revisa tu membresía para continuar.'
          : 'No pude procesar tu solicitud. Puede ser un problema momentáneo de conexión o del servicio de IA.',
        canRetry: !is403,
      } as any,
    ]);
  }, []);

  const sendMessage = async (messageText = input) => {
    const text = messageText.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { type: 'user', content: text }]);
    setInput('');
    setLoading(true);
    setShowQuickActions(false);

    try {
      const response = await chatWithAI({ message: text });
      setMessages((prev) => [
        ...prev,
        { type: 'ai', content: response.response, timestamp: new Date() },
        ...(response.suggestions?.length ? [{ type: 'ai', suggestions: response.suggestions } as any] : []),
      ]);
      lastActionRef.current = null;
    } catch (error) {
      pushError(error, () => sendMessage(text));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    if (loading) return;
    if (action === 'predict') {
      sendMessage('¿Cuánto gastaré el próximo mes según mis hábitos?');
      return;
    }

    setLoading(true);
    setShowQuickActions(false);
    try {
      let aiMessage: any;
      if (action === 'analyze') {
        const r = await analyzeFinancialData({ period: 'month' });
        aiMessage = {
          type: 'ai',
          content: r.analysis?.summary || 'Análisis de tu mes:',
          insights: r.analysis?.insights || [],
          recommendations: r.analysis?.recommendations || [],
        };
      } else if (action === 'recommendations') {
        const r = await getFinancialRecommendations();
        aiMessage = { type: 'ai', content: 'Tus recomendaciones personalizadas:', recommendations: r.recommendations || [] };
      } else {
        const r = await getFinancialInsights({ months: 3 });
        aiMessage = { type: 'ai', content: 'Tendencias de tus últimos 3 meses:', insights: r.insights?.trends || [] };
      }
      setMessages((prev) => [...prev, { ...aiMessage, timestamp: new Date() }]);
      lastActionRef.current = null;
    } catch (error) {
      pushError(error, () => handleQuickAction(action));
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    const retry = lastActionRef.current;
    if (!retry) return;
    // Quita el mensaje de error antes de reintentar
    setMessages((prev) => prev.filter((m: any) => !m.isError));
    retry();
  };

  const formatTime = (t: any) =>
    new Date(t).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <PageHeader
        title={<span className="flex items-center gap-3">Asistente IA+ <PlatinumBadge /></span>}
        subtitle="Conversa con la IA sobre tus movimientos reales del BCP"
      />

      <div className="bg-card rounded-[2rem] border border-subtle shadow-xl overflow-hidden flex flex-col" style={{ height: 'min(72vh, 760px)' }}>
        {/* Acciones rápidas */}
        <AnimatePresence>
          {showQuickActions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-subtle"
            >
              <div className="p-4">
                <p className="micro-label mb-3">Acciones rápidas</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {QUICK_ACTIONS.map(({ id, icon: Icon, title, description }) => (
                    <button
                      key={id}
                      onClick={() => handleQuickAction(id)}
                      disabled={loading}
                      className="text-left p-3.5 rounded-2xl bg-base/60 border border-subtle hover:border-primary/40 hover:-translate-y-0.5 transition-all disabled:opacity-50"
                    >
                      <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary dark:text-primary-300 flex items-center justify-center mb-2">
                        <Icon className="w-4 h-4" strokeWidth={2.25} />
                      </div>
                      <p className="text-sm font-bold text-main leading-tight">{title}</p>
                      <p className="text-[11px] text-muted mt-0.5 leading-snug">{description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversación */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-base/40">
          {messages.map((message: any, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'user' ? (
                <div className="max-w-[75%] bg-brand-primary text-white dark:text-brand-dark px-4 py-2.5 rounded-2xl rounded-br-md">
                  <p className="text-sm font-medium">{message.content}</p>
                </div>
              ) : (
                <div className="max-w-[88%] flex items-start gap-2.5">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    message.isError ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary dark:text-primary-300'
                  }`}>
                    {message.isError ? <AlertTriangle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  </div>
                  <div className={`flex-1 min-w-0 px-4 py-3 rounded-2xl rounded-tl-md border ${
                    message.isError ? 'bg-amber-500/5 border-amber-500/20' : 'bg-card border-subtle'
                  }`}>
                    {message.content && (
                      <p className="text-sm text-main whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    )}

                    {message.isError && message.canRetry && (
                      <button onClick={handleRetry} className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary dark:text-primary-300 hover:opacity-80 transition">
                        <RotateCcw className="w-3.5 h-3.5" /> Reintentar
                      </button>
                    )}

                    {message.insights?.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <p className="micro-label flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5" /> Hallazgos</p>
                        {message.insights.map((insight: string, i: number) => (
                          <p key={i} className="pl-3 border-l-2 border-primary/40 text-sm text-main/85 leading-relaxed">{insight}</p>
                        ))}
                      </div>
                    )}

                    {message.recommendations?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="micro-label flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Recomendaciones</p>
                        {message.recommendations.map((rec: any, i: number) => (
                          <div key={i} className="p-3 bg-sage-600/5 dark:bg-sage-600/10 rounded-xl border border-sage-600/15">
                            <p className="text-sm font-semibold text-main">{typeof rec === 'string' ? rec : rec.title}</p>
                            {typeof rec !== 'string' && rec.description && (
                              <p className="text-xs text-muted mt-0.5 leading-relaxed">{rec.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {message.suggestions?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion: string, i: number) => (
                          <button
                            key={i}
                            onClick={() => sendMessage(suggestion)}
                            disabled={loading}
                            className="text-xs font-semibold px-3 py-1.5 bg-primary/10 text-primary dark:text-primary-300 border border-primary/20 rounded-full hover:bg-primary/20 transition disabled:opacity-50"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}

                    {message.timestamp && (
                      <p className="text-[10px] font-mono text-muted mt-2">{formatTime(message.timestamp)}</p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary dark:text-primary-300 flex items-center justify-center">
                <Sparkles className="w-4 h-4 animate-pulse motion-reduce:animate-none" />
              </div>
              <div className="bg-card border border-subtle px-4 py-3 rounded-2xl rounded-tl-md flex gap-1.5">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-1.5 h-1.5 bg-brand-primary/50 rounded-full animate-bounce motion-reduce:animate-none" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Entrada */}
        <div className="p-4 border-t border-subtle bg-card">
          {isListening && (
            <div className="mb-3 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2.5" role="status">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
              <span className="text-sm font-semibold text-main">Escuchando… habla ahora</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleVoiceInput}
              disabled={loading}
              aria-label={isListening ? 'Detener dictado' : 'Dictar por voz'}
              className={`h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center transition ${
                isListening
                  ? 'bg-rose-500 text-white'
                  : 'bg-base/60 border border-subtle text-muted hover:text-primary hover:bg-primary/10'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={loading}
              placeholder="Pregúntame sobre tus finanzas…"
              aria-label="Mensaje para el asistente"
              className="input-field flex-1 min-w-0"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              aria-label="Enviar mensaje"
              className="h-11 w-11 shrink-0 rounded-2xl bg-brand-primary text-white dark:text-brand-dark flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition shadow-lg shadow-black/10"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted text-center">
            Las respuestas se generan con IA a partir de tus movimientos. Verifica los montos importantes.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default EnhancedAIAssistant;
