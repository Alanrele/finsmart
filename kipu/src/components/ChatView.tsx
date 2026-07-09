/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { 
  Send, 
  Sparkles, 
  MessageSquare, 
  User, 
  HelpCircle, 
  RefreshCw,
  TrendingDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface ChatViewProps {
  chatHistory: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isSending: boolean;
}

const CHAT_SUGGESTIONS = [
  "¿Cómo puedo recortar gastos en Comida?",
  "Explícame la regla de ahorro 50/30/20",
  "Dame 3 consejos de ahorro en Soles",
  "Analiza mis gastos de este mes"
];

export default function ChatView({ chatHistory, onSendMessage, isSending }: ChatViewProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const msg = inputText.trim();
    setInputText('');
    await onSendMessage(msg);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    if (isSending) return;
    await onSendMessage(suggestion);
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isSending]);

  return (
    <motion.div 
      className="flex flex-col h-[calc(100vh-140px)] min-h-[500px]"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-subtle pb-4 mb-4 shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight text-main flex items-center gap-2.5">
            <span>Kipu AI Chat</span>
          </h1>
          <p className="text-sm text-muted font-sans mt-1">Pregúntale a tu asistente financiero personal con tecnología Gemini</p>
        </div>
      </div>

      {/* Main chat layout split */}
      <div className="flex-1 flex flex-col md:flex-row gap-5 min-h-0">
        {/* Messages list container */}
        <div className="flex-1 bg-card border border-subtle rounded-[2.5rem] flex flex-col min-h-0 shadow-xl relative overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-14 h-14 bg-brand-primary/10 border border-brand-primary/15 text-brand-primary rounded-2xl flex items-center justify-center mb-4 shadow-md">
                  <Sparkles size={24} className="text-brand-primary animate-pulse" />
                </div>
                <h3 className="text-base font-serif italic text-main">¡Hola! Soy Kipu AI</h3>
                <p className="text-xs text-muted mt-2 max-w-sm leading-relaxed">
                  Estoy listo para ayudarte a auditar tus transacciones, crear presupuestos eficaces y encontrar oportunidades de ahorro. ¿De qué te gustaría hablar hoy?
                </p>
              </div>
            ) : (
              chatHistory.map((msg) => {
                const isKipu = msg.sender === 'kipu';
                return (
                  <div 
                    key={msg.id}
                    className={`flex gap-3 max-w-[85%] ${isKipu ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                      isKipu 
                        ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' 
                        : 'bg-brand-primary/25 text-brand-primary border-brand-primary/30'
                    }`}>
                      {isKipu ? <Sparkles size={14} /> : <User size={14} />}
                    </div>

                    {/* Speech bubble */}
                    <div className="flex flex-col gap-1">
                      <div className={`p-4 rounded-3xl text-sm leading-relaxed ${
                        isKipu 
                          ? 'bg-base/60 text-main border border-subtle rounded-tl-sm' 
                          : 'bg-brand-primary text-brand-dark font-semibold rounded-tr-sm shadow-md'
                      }`}>
                        {isKipu ? (
                          <div className="markdown-body text-sm text-main font-sans">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap font-sans">{msg.content}</p>
                        )}
                      </div>
                      <span className={`text-[9px] font-mono tracking-widest text-muted px-1 mt-0.5 ${isKipu ? 'text-left' : 'text-right'}`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            {/* AI is thinking loader */}
            {isSending && (
              <div className="flex gap-3 max-w-[80%] mr-auto">
                <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 flex items-center justify-center shrink-0">
                  <Sparkles size={14} className="animate-pulse" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="bg-base/60 border border-subtle p-4 rounded-3xl rounded-tl-sm text-sm">
                    <div className="flex items-center gap-1.5 py-1">
                      <div className="w-2 h-2 bg-brand-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-brand-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-brand-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Mobile horizontal suggestions */}
          <div className="flex md:hidden gap-2 overflow-x-auto px-4 py-2 border-t border-subtle bg-base/20 scrollbar-none shrink-0">
            {CHAT_SUGGESTIONS.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => handleSuggestionClick(sug)}
                disabled={isSending}
                className="whitespace-nowrap px-3 py-1 bg-card hover:bg-base border border-subtle text-main rounded-full text-[10px] font-bold transition-all cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Form input bar */}
          <div className="p-4 border-t border-subtle bg-base/40">
            <form onSubmit={handleFormSubmit} className="flex gap-2.5">
              <input 
                type="text"
                required
                disabled={isSending}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Pregúntale a Kipu AI (Ej. Dame un consejo de ahorro)..."
                className="flex-1 bg-base/50 border border-subtle rounded-xl px-4 py-3 text-sm text-main placeholder-muted/50 focus:outline-none focus:border-brand-primary focus:bg-base transition-all font-sans"
              />
              <button
                type="submit"
                disabled={isSending || !inputText.trim()}
                className="p-3.5 bg-brand-primary text-brand-dark hover:opacity-90 disabled:opacity-30 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-md"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>

        {/* Desktop sidebar with helpful suggestions */}
        <div className="hidden md:flex w-full md:w-64 shrink-0 flex-col gap-4">
          <div className="bg-card p-6 rounded-[2.5rem] border border-subtle shadow-xl">
            <h3 className="text-xs font-bold text-muted uppercase tracking-widest font-mono mb-4 flex items-center gap-1.5">
              <HelpCircle size={14} />
              <span>Sugerencias</span>
            </h3>
            <div className="space-y-2.5">
              {CHAT_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  onClick={() => handleSuggestionClick(sug)}
                  disabled={isSending}
                  className="w-full text-left p-3 text-xs bg-base/50 hover:bg-base disabled:opacity-50 text-main rounded-2xl border border-subtle transition-all cursor-pointer font-semibold leading-relaxed"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* AI Info Card */}
          <div className="bg-card p-6 rounded-[2.5rem] border border-subtle shadow-xl text-center flex-1 flex flex-col justify-center">
            <Sparkles size={24} className="mx-auto text-brand-primary/60 mb-3 animate-pulse" />
            <h4 className="text-xs font-serif italic text-main">Privacidad y Seguridad</h4>
            <p className="text-[10px] text-muted leading-relaxed mt-2">
              Kipu AI procesa tus transacciones de manera segura e in-memory para resguardar tu información personal bajo estándares de encriptación avanzados.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
