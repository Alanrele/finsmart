/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FinanceAnalysis, Transaction } from '../types';
import { 
  Sparkles, 
  Lightbulb, 
  RefreshCw, 
  Award, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface AnalysisViewProps {
  transactions: Transaction[];
  currencySymbol: string;
}

const LOADING_MESSAGES = [
  "Iniciando auditoría de tus balances...",
  "Analizando categorías de gasto...",
  "Kipu AI está evaluando patrones de ahorro...",
  "Generando plan de salud financiera personalizado...",
  "Estableciendo puntaje final de bienestar..."
];

export default function AnalysisView({ transactions, currencySymbol }: AnalysisViewProps) {
  const [analysisData, setAnalysisData] = useState<FinanceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [error, setError] = useState('');

  const fetchAnalysis = async (forceRegenerate = false) => {
    setLoading(true);
    setError('');
    
    // Cycle messages
    let msgInterval: any;
    if (forceRegenerate) {
      setLoadingMsgIdx(0);
      msgInterval = setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 2500);
    }

    try {
      const res = await fetch('/api/analyze-finances');
      if (!res.ok) {
        throw new Error('No se pudo establecer conexión con el motor de análisis.');
      }
      const data = await res.json();
      setAnalysisData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al conectar con la Inteligencia Artificial.');
    } finally {
      setLoading(false);
      if (msgInterval) clearInterval(msgInterval);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [transactions.length]); // Auto refresh if transaction count changes

  // Score color helper for theme
  const getScoreColor = (score: number) => {
    if (score >= 80) return { 
      border: 'stroke-emerald-500', 
      text: 'text-emerald-500', 
      bg: 'bg-emerald-500/10 border border-emerald-500/20', 
      badge: 'Sobresaliente' 
    };
    if (score >= 60) return { 
      border: 'stroke-brand-primary', 
      text: 'text-brand-primary', 
      bg: 'bg-brand-primary/10 border border-brand-primary/20', 
      badge: 'Estable' 
    };
    return { 
      border: 'stroke-rose-500', 
      text: 'text-rose-500', 
      bg: 'bg-rose-500/10 border border-rose-500/20', 
      badge: 'Por mejorar' 
    };
  };

  const scoreMeta = analysisData ? getScoreColor(analysisData.score) : null;

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight text-main">Análisis Inteligente</h1>
          <p className="text-sm text-muted font-sans mt-1">Salud financiera auditada en tiempo real por Kipu AI</p>
        </div>
        <button 
          onClick={() => fetchAnalysis(true)}
          disabled={loading}
          className="flex items-center gap-2 bg-brand-primary hover:opacity-90 disabled:opacity-50 text-brand-dark px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider font-mono shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Recalcular Análisis</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-card rounded-[2.5rem] border border-subtle p-16 text-center min-h-[400px] flex flex-col justify-center items-center shadow-xl">
          <div className="relative flex items-center justify-center mb-8">
            <div className="w-16 h-16 border-4 border-brand-primary/15 border-t-brand-primary rounded-full animate-spin" />
            <Sparkles className="absolute text-brand-primary animate-pulse" size={24} />
          </div>
          <h3 className="text-base font-bold text-main animate-pulse transition-all duration-500">
            {LOADING_MESSAGES[loadingMsgIdx]}
          </h3>
          <p className="text-xs text-muted mt-3 font-sans max-w-sm leading-relaxed">
            Nuestros algoritmos están examinando tus ingresos, gastos y tendencias para darte una evaluación de salud de nivel platino.
          </p>
        </div>
      ) : error ? (
        <div className="bg-card rounded-[2.5rem] border border-subtle p-12 text-center shadow-xl">
          <div className="mx-auto w-12 h-12 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-base font-bold text-main">Ups, algo salió mal</h3>
          <p className="text-xs text-muted mt-1.5 max-w-sm mx-auto leading-relaxed">{error}</p>
          <button 
            onClick={() => fetchAnalysis(true)}
            className="mt-5 px-5 py-2.5 bg-brand-primary hover:opacity-90 text-brand-dark text-xs font-bold rounded-full uppercase tracking-wider shadow-lg cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      ) : analysisData && scoreMeta ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Health Score Card */}
          <div className="lg:col-span-4 space-y-6">
            {/* Score Ring */}
            <div className="bg-card p-6 rounded-[2rem] border border-subtle shadow-xl flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold text-muted uppercase tracking-widest font-mono mb-6">Puntuación Kipu AI</span>
              
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Outer circle track */}
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-subtle)" strokeWidth="8" />
                  {/* Dynamic circle slice */}
                  <motion.circle 
                    cx="50" 
                    cy="50" 
                    r="42" 
                    fill="none" 
                    className={scoreMeta.border} 
                    strokeWidth="8" 
                    strokeDasharray="263.8"
                    initial={{ strokeDashoffset: 263.8 }}
                    animate={{ strokeDashoffset: 263.8 - (263.8 * analysisData.score) / 100 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-extrabold font-display text-main">{analysisData.score}</span>
                  <span className="text-[10px] text-muted font-bold uppercase tracking-widest mt-0.5">Salud</span>
                </div>
              </div>

              <div className={`mt-5 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm ${scoreMeta.bg} ${scoreMeta.text}`}>
                <Award size={14} />
                <span>Rango: {scoreMeta.badge}</span>
              </div>

              <p className="text-xs text-muted font-sans mt-5 leading-relaxed">
                Este indicador evalúa la regularidad de tus ahorros, la diversificación de gastos y el mantenimiento de un balance positivo constante.
              </p>
            </div>

            {/* Micro recommendations highlights list */}
            <div className="bg-card p-6 rounded-[2rem] border border-subtle shadow-xl">
              <h3 className="text-sm font-bold text-main mb-4 flex items-center gap-1.5 border-b border-subtle pb-3">
                <Lightbulb className="text-brand-primary" size={16} />
                <span className="font-serif italic text-main">Sugerencias Directas</span>
              </h3>
              <div className="space-y-3.5 font-sans">
                {analysisData.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start">
                    <div className="p-1 bg-brand-primary/15 text-brand-primary rounded-md shrink-0 mt-0.5">
                      <CheckCircle2 size={12} />
                    </div>
                    <span className="text-xs text-main font-medium leading-relaxed">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: AI Markdown Report Card */}
          <div className="lg:col-span-8 bg-card p-8 rounded-[2.5rem] border border-subtle shadow-xl">
            <div className="flex items-center gap-3 mb-6 border-b border-subtle pb-5">
              <div className="p-2.5 bg-brand-primary/10 text-brand-primary rounded-xl">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="text-lg font-serif italic text-main">Análisis Financiero Avanzado</h2>
                <p className="text-xs text-muted mt-1">Generado dinámicamente con tecnología avanzada Gemini</p>
              </div>
            </div>
            
            <div className="markdown-body text-sm text-main">
              <ReactMarkdown>{analysisData.analysis}</ReactMarkdown>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-[2.5rem] border border-subtle p-16 text-center shadow-xl">
          <p className="text-sm text-muted">Presiona recalcular para generar tu reporte de salud de nivel platino.</p>
        </div>
      )}
    </motion.div>
  );
}
