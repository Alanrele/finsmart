/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SavingsGoal } from '../types';
import { 
  PiggyBank, 
  Plus, 
  Trash2, 
  Sparkles, 
  Calendar, 
  TrendingUp, 
  RefreshCw, 
  Target, 
  ArrowRight,
  ChevronRight,
  HelpCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface AssistantViewProps {
  savingsGoals: SavingsGoal[];
  currencySymbol: string;
  onAddGoal: (goal: Omit<SavingsGoal, 'id'>) => Promise<void>;
  onAddSavings: (id: string, amount: number) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
}

export default function AssistantView({
  savingsGoals,
  currencySymbol,
  onAddGoal,
  onAddSavings,
  onDeleteGoal
}: AssistantViewProps) {
  // Add Goal Form state
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [isSubmittingGoal, setIsSubmittingGoal] = useState(false);

  // Add Savings input state
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [savingsAmount, setSavingsAmount] = useState('');
  const [isSavingSubmitting, setIsSavingSubmitting] = useState(false);

  // AI Planner state
  const [aiGoalName, setAiGoalName] = useState('');
  const [aiGoalTarget, setAiGoalTarget] = useState('');
  const [aiGoalDeadline, setAiGoalDeadline] = useState('');
  const [aiPlan, setAiPlan] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim() || !goalTarget || !goalDeadline) return;

    setIsSubmittingGoal(true);
    try {
      await onAddGoal({
        name: goalName.trim(),
        target: parseFloat(goalTarget),
        current: 0,
        deadline: goalDeadline
      });
      setGoalName('');
      setGoalTarget('');
      setGoalDeadline('');
      setIsAddGoalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingGoal(false);
    }
  };

  const handleAddSavingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId || !savingsAmount) return;

    setIsSavingSubmitting(true);
    try {
      await onAddSavings(selectedGoalId, parseFloat(savingsAmount));
      setSavingsAmount('');
      setSelectedGoalId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingSubmitting(false);
    }
  };

  const handleGenerateAiPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiGoalName.trim()) return;

    setIsPlanning(true);
    setAiPlan('');
    try {
      const res = await fetch('/api/goals/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalName: aiGoalName.trim(),
          target: aiGoalTarget ? parseFloat(aiGoalTarget) : 3500,
          deadline: aiGoalDeadline || 'Próximos 6 meses'
        })
      });
      const data = await res.json();
      setAiPlan(data.plan || 'No se pudo generar el plan.');
    } catch (err) {
      console.error(err);
      setAiPlan('Error de conexión al generar el plan de ahorro de Kipu AI.');
    } finally {
      setIsPlanning(false);
    }
  };

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
          <h1 className="text-3xl font-extrabold font-display tracking-tight text-main">Asistente IA y Metas</h1>
          <p className="text-sm text-muted font-sans mt-1">Planes de ahorro y asesoramiento financiero inteligente</p>
        </div>
        <button 
          onClick={() => setIsAddGoalOpen(true)}
          className="flex items-center gap-2 bg-brand-primary hover:opacity-90 text-white dark:text-brand-dark px-5 py-2.5 rounded-full font-bold text-xs tracking-wide uppercase shadow-lg cursor-pointer transition-all transform active:scale-95"
        >
          <Plus size={14} />
          <span>Crear Nueva Meta</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Goals List */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-card p-8 rounded-[2.5rem] border border-subtle shadow-xl">
            <h2 className="text-lg font-serif italic text-main mb-6">Tus Metas Activas</h2>

            {savingsGoals.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-12 h-12 bg-brand-primary/10 border border-brand-primary/15 text-brand-primary rounded-full flex items-center justify-center mb-4">
                  <PiggyBank size={24} />
                </div>
                <h3 className="text-sm font-bold text-main">No hay metas activas</h3>
                <p className="text-xs text-muted mt-1">Crea una meta y Kipu AI te ayudará a estructurar tus aportes de ahorro.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {savingsGoals.map((goal) => {
                  const percent = Math.min(100, (goal.current / goal.target) * 100);
                  return (
                    <motion.div 
                      key={goal.id}
                      className="bg-base/40 p-5 rounded-[2rem] border border-subtle relative group shadow-md"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-brand-primary/10 text-brand-primary rounded-xl">
                            <Target size={18} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-main">{goal.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar size={12} className="text-muted" />
                              <span className="text-[10px] text-muted font-mono">Límite: {goal.deadline}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => onDeleteGoal(goal.id)}
                          className="p-1.5 text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all md:opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Progress Metrics */}
                      <div className="flex justify-between items-baseline text-xs font-semibold mb-2">
                        <span className="text-muted">Progreso de ahorro</span>
                        <span className="font-mono text-main">
                          {currencySymbol}{goal.current.toLocaleString('es-PE')} / {currencySymbol}{goal.target.toLocaleString('es-PE')} ({percent.toFixed(0)}%)
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-brand-primary/10 h-2.5 rounded-full overflow-hidden mb-4">
                        <div 
                          className="bg-brand-primary h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      {/* Actions inside Goal */}
                      <div className="flex justify-between items-center">
                        <button
                          onClick={() => setSelectedGoalId(goal.id)}
                          className="text-xs font-bold text-brand-primary bg-brand-primary/10 hover:bg-brand-primary hover:text-brand-dark border border-brand-primary/20 px-4 py-2 rounded-full transition-all cursor-pointer"
                        >
                          + Registrar Ahorro
                        </button>
                        <button
                          onClick={() => {
                            setAiGoalName(goal.name);
                            setAiGoalTarget(goal.target.toString());
                            setAiGoalDeadline(goal.deadline);
                          }}
                          className="text-xs font-bold text-muted hover:text-main transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <span>Generar Plan IA</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: AI Goal Planner Generator */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-card p-8 rounded-[2.5rem] border border-subtle shadow-xl flex flex-col justify-between min-h-[400px]">
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="p-2 bg-brand-primary/10 text-brand-primary border border-brand-primary/15 rounded-xl">
                  <Sparkles size={18} />
                </div>
                <h2 className="text-lg font-serif italic text-main">Planificador de Ahorro Kipu AI</h2>
              </div>
              <p className="text-xs text-muted leading-relaxed mb-6">
                Ingresa una meta financiera y Gemini AI diseñará una hoja de ruta con aportaciones semanales y consejos personalizados de optimización de presupuesto.
              </p>

              <form onSubmit={handleGenerateAiPlan} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5 font-mono">Nombre de la Meta</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Auto seminuevo, Viaje a Cusco..."
                    value={aiGoalName}
                    onChange={(e) => setAiGoalName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-base/50 border border-subtle rounded-xl text-sm text-main placeholder-muted/50 focus:outline-none focus:border-brand-primary focus:bg-base transition-all font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5 font-mono">Monto ({currencySymbol})</label>
                    <input
                      type="number"
                      placeholder="3500"
                      value={aiGoalTarget}
                      onChange={(e) => setAiGoalTarget(e.target.value)}
                      className="w-full px-4 py-2.5 bg-base/50 border border-subtle rounded-xl text-sm text-main placeholder-muted/50 focus:outline-none focus:border-brand-primary focus:bg-base transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5 font-mono">Plazo / Fecha</label>
                    <input
                      type="text"
                      placeholder="Dic 2026"
                      value={aiGoalDeadline}
                      onChange={(e) => setAiGoalDeadline(e.target.value)}
                      className="w-full px-4 py-2.5 bg-base/50 border border-subtle rounded-xl text-sm text-main placeholder-muted/50 focus:outline-none focus:border-brand-primary focus:bg-base transition-all font-sans"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPlanning}
                  className="w-full py-3 bg-brand-primary hover:opacity-90 text-white dark:text-brand-dark text-xs font-bold rounded-full tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg mt-2"
                >
                  {isPlanning ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Estructurando Plan...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Generar Plan Inteligente</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Full-width AI Result section when plan is ready */}
      <AnimatePresence>
        {aiPlan && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="bg-card p-8 rounded-[2.5rem] border border-subtle shadow-xl relative"
          >
            <button 
              onClick={() => setAiPlan('')}
              className="absolute top-6 right-6 p-1.5 bg-base hover:opacity-80 rounded-lg text-muted hover:text-main transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            <div className="flex items-center gap-3 mb-6 border-b border-subtle pb-4">
              <div className="p-2 bg-brand-primary/10 text-brand-primary border border-brand-primary/15 rounded-xl">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-base font-serif italic text-main">Tu Plan de Ahorros Personalizado</h3>
                <p className="text-xs text-muted mt-1">Diseñado para {aiGoalName || "tu meta"}</p>
              </div>
            </div>
            <div className="markdown-body text-sm text-main max-w-none font-sans">
              <ReactMarkdown>{aiPlan}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add savings action overlay sheet */}
      <AnimatePresence>
        {selectedGoalId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGoalId(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-card w-full max-w-sm p-8 rounded-[2.5rem] border border-subtle shadow-xl z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-bold font-display text-main">Registrar Ahorro</h3>
                <button 
                  onClick={() => setSelectedGoalId(null)}
                  className="p-1 hover:bg-base rounded text-muted hover:text-main transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleAddSavingsSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5 font-mono">Monto a Depositar ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={savingsAmount}
                    onChange={(e) => setSavingsAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-base/50 border border-subtle rounded-xl text-lg font-bold text-main focus:outline-none focus:border-brand-primary focus:bg-base transition-all font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSavingSubmitting}
                  className="w-full py-3 bg-brand-primary hover:opacity-90 text-white dark:text-brand-dark text-xs font-bold rounded-full tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  {isSavingSubmitting ? "Registrando..." : "Confirmar Depósito"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Goal creation overlay sheet */}
      <AnimatePresence>
        {isAddGoalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddGoalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-card w-full max-w-md p-8 rounded-[2.5rem] border border-subtle shadow-xl z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <PiggyBank className="text-brand-primary" size={20} />
                  <h3 className="text-lg font-bold font-display text-main">Nueva Meta de Ahorro</h3>
                </div>
                <button 
                  onClick={() => setIsAddGoalOpen(false)}
                  className="p-1 hover:bg-base rounded text-muted hover:text-main transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleCreateGoal} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5 font-mono">Nombre de la Meta</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Fondo de Emergencia, PS5..."
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-base/50 border border-subtle rounded-xl text-sm text-main placeholder-muted/50 focus:outline-none focus:border-brand-primary focus:bg-base transition-all font-sans"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5 font-mono">Monto Objetivo ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="w-full px-4 py-2.5 bg-base/50 border border-subtle rounded-xl text-sm text-main placeholder-muted/50 focus:outline-none focus:border-brand-primary focus:bg-base transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5 font-mono">Fecha Límite</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Dic 2026, 31/12/2026"
                    value={goalDeadline}
                    onChange={(e) => setGoalDeadline(e.target.value)}
                    className="w-full px-4 py-2.5 bg-base/50 border border-subtle rounded-xl text-sm text-main placeholder-muted/50 focus:outline-none focus:border-brand-primary focus:bg-base transition-all font-sans"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingGoal}
                  className="w-full mt-2 py-3.5 bg-brand-primary hover:opacity-90 text-white dark:text-brand-dark text-xs font-bold rounded-full tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  {isSubmittingGoal ? "Creando..." : "Crear Meta"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
