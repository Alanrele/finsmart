/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  Percent, 
  DollarSign, 
  Activity, 
  Calendar,
  PiggyBank,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';

interface ToolsViewProps {
  currencySymbol: string;
}

export default function ToolsView({ currencySymbol }: ToolsViewProps) {
  const [activeTool, setActiveTool] = useState<'compound' | 'budget'>('compound');

  // Compound Interest State
  const [initialCapital, setInitialCapital] = useState('1000');
  const [monthlyContribution, setMonthlyContribution] = useState('100');
  const [annualRate, setAnnualRate] = useState('8');
  const [years, setYears] = useState('5');

  // Budget Calculator State
  const [monthlyIncome, setMonthlyIncome] = useState('3000');

  // Calculations for Compound Interest
  const p = parseFloat(initialCapital) || 0;
  const pmt = parseFloat(monthlyContribution) || 0;
  const r = (parseFloat(annualRate) || 0) / 100 / 12;
  const t = (parseFloat(years) || 1) * 12;

  let totalBalance = p;
  let totalInvested = p;

  for (let i = 0; i < t; i++) {
    totalBalance = totalBalance * (1 + r) + pmt;
    totalInvested += pmt;
  }

  const totalEarnedInterest = Math.max(0, totalBalance - totalInvested);

  // Calculations for 50/30/20 Budget Rule
  const income = parseFloat(monthlyIncome) || 0;
  const needs = income * 0.50;
  const wants = income * 0.30;
  const savings = income * 0.20;

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
          <h1 className="text-3xl font-extrabold font-display tracking-tight text-main">Herramientas Financieras</h1>
          <p className="text-sm text-muted font-sans mt-1">Calculadoras analíticas para modelar tus decisiones de inversión y presupuestos</p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-base p-1 rounded-xl border border-subtle shadow-md">
          <button
            onClick={() => setActiveTool('compound')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTool === 'compound' 
                ? 'bg-brand-primary text-white dark:text-brand-dark shadow' 
                : 'text-main/70 dark:text-muted hover:text-main'
            }`}
          >
            Interés Compuesto
          </button>
          <button
            onClick={() => setActiveTool('budget')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTool === 'budget' 
                ? 'bg-brand-primary text-white dark:text-brand-dark shadow' 
                : 'text-main/70 dark:text-muted hover:text-main'
            }`}
          >
            Regla 50/30/20
          </button>
        </div>
      </div>

      {activeTool === 'compound' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Inputs */}
          <div className="lg:col-span-5 bg-card p-8 rounded-[2.5rem] border border-subtle shadow-xl space-y-4 font-sans">
            <h2 className="text-lg font-serif italic text-main mb-4">Simulador de Inversión</h2>

            {/* Initial Capital */}
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5 font-mono">Capital Inicial ({currencySymbol})</label>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(e.target.value)}
                className="w-full px-4 py-2.5 bg-base/50 border border-subtle rounded-xl text-sm text-main placeholder-muted/50 focus:outline-none focus:border-brand-primary focus:bg-base transition-all font-mono"
              />
            </div>

            {/* Monthly Contribution */}
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5 font-mono">Aporte Mensual ({currencySymbol})</label>
              <input
                type="number"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
                className="w-full px-4 py-2.5 bg-base/50 border border-subtle rounded-xl text-sm text-main placeholder-muted/50 focus:outline-none focus:border-brand-primary focus:bg-base transition-all font-mono"
              />
            </div>

            {/* Annual Interest Rate */}
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5 font-mono">Tasa de Interés Anual (%)</label>
              <input
                type="number"
                step="0.1"
                value={annualRate}
                onChange={(e) => setAnnualRate(e.target.value)}
                className="w-full px-4 py-2.5 bg-base/50 border border-subtle rounded-xl text-sm text-main placeholder-muted/50 focus:outline-none focus:border-brand-primary focus:bg-base transition-all font-mono"
              />
            </div>

            {/* Years */}
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5 font-mono">Plazo en Años</label>
              <input
                type="number"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                className="w-full px-4 py-2.5 bg-base/50 border border-subtle rounded-xl text-sm text-main placeholder-muted/50 focus:outline-none focus:border-brand-primary focus:bg-base transition-all font-mono"
              />
            </div>
          </div>

          {/* Results outputs */}
          <div className="lg:col-span-7 bg-card p-8 rounded-[2.5rem] border border-subtle shadow-xl flex flex-col justify-between font-sans">
            <div>
              <h2 className="text-lg font-serif italic text-main mb-6">Proyección Estimada</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Balance Card */}
                <div className="bg-base/40 border border-subtle p-5 rounded-[2rem] text-center shadow-md">
                  <span className="text-[9px] font-bold text-muted uppercase tracking-widest block font-mono">Balance Final</span>
                  <span className="text-2xl font-light text-main mt-1.5 block font-display">
                    {currencySymbol} {totalBalance.toLocaleString('es-PE', { maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Total Invested */}
                <div className="bg-base/40 border border-subtle p-5 rounded-[2rem] text-center shadow-md">
                  <span className="text-[9px] font-bold text-muted uppercase tracking-widest block font-mono">Total Aportado</span>
                  <span className="text-2xl font-light text-main mt-1.5 block font-display">
                    {currencySymbol} {totalInvested.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
                  </span>
                </div>

                {/* Earned Interest */}
                <div className="bg-base/40 border border-subtle p-5 rounded-[2rem] text-center shadow-md">
                  <span className="text-[9px] font-bold text-muted uppercase tracking-widest block font-mono">Interés Ganado</span>
                  <span className="text-2xl font-bold text-emerald-500 mt-1.5 block font-display">
                    {currencySymbol} {totalEarnedInterest.toLocaleString('es-PE', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Explanatory insights card */}
              <div className="bg-base/50 border border-subtle p-5 rounded-[2rem] mt-6 flex gap-3 items-start">
                <div className="p-2 bg-brand-primary/15 text-brand-primary rounded-lg mt-0.5 shrink-0">
                  <TrendingUp size={16} />
                </div>
                <div className="text-xs text-main leading-relaxed">
                  <p className="font-bold text-brand-primary mb-1">El Efecto Bola de Nieve</p>
                  <span>
                    Al reinvertir las ganancias continuamente en el plazo de <strong>{years} años</strong>, tu interés acumulado asciende a <strong>{currencySymbol} {totalEarnedInterest.toLocaleString('es-PE', { maximumFractionDigits: 0 })}</strong>. Esto representa el poder multiplicador del capital con una tasa de {annualRate}% anual.
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-muted mt-6 font-mono text-center">
              *Los resultados son simulaciones hipotéticas basadas en capitalizaciones mensuales constantes.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Inputs */}
          <div className="lg:col-span-5 bg-card p-8 rounded-[2.5rem] border border-subtle shadow-xl space-y-4 font-sans">
            <h2 className="text-lg font-serif italic text-main mb-4">Regla Presupuestaria</h2>

            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5 font-mono">Tus Ingresos Mensuales ({currencySymbol})</label>
              <input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                className="w-full px-4 py-3 bg-base/50 border border-subtle rounded-xl text-lg font-bold text-main focus:outline-none focus:border-brand-primary focus:bg-base transition-all font-mono"
              />
            </div>

            <p className="text-xs text-muted leading-relaxed font-sans pt-2">
              La regla 50/30/20 es un método simplificado y sumamente eficaz para distribuir tus ingresos mensuales de manera equilibrada y saludable.
            </p>
          </div>

          {/* Results outputs */}
          <div className="lg:col-span-7 bg-card p-8 rounded-[2.5rem] border border-subtle shadow-xl flex flex-col justify-between font-sans">
            <div>
              <h2 className="text-lg font-serif italic text-main mb-6">Distribución Recomendada</h2>

              <div className="space-y-4">
                {/* Needs 50% */}
                <div className="bg-base/40 border border-subtle p-4 rounded-[2rem] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-main block">Necesidades Primarias (50%)</span>
                    <span className="text-[10px] text-muted mt-1 block">Vivienda, alimentación, servicios esenciales, deudas básicas</span>
                  </div>
                  <span className="text-xl font-bold text-main font-display shrink-0 pl-4">
                    {currencySymbol} {needs.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
                  </span>
                </div>

                {/* Wants 30% */}
                <div className="bg-base/40 border border-subtle p-4 rounded-[2rem] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-main block">Deseos y Ocio (30%)</span>
                    <span className="text-[10px] text-muted mt-1 block">Salidas, suscripciones, entretenimiento, compras de gusto</span>
                  </div>
                  <span className="text-xl font-bold text-main font-display shrink-0 pl-4">
                    {currencySymbol} {wants.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
                  </span>
                </div>

                {/* Savings 20% */}
                <div className="bg-base/40 border border-subtle p-4 rounded-[2rem] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-500 block">Ahorro e Inversión (20%)</span>
                    <span className="text-[10px] text-muted mt-1 block">Fondo de emergencia, aportes a metas activas de Kipu</span>
                  </div>
                  <span className="text-xl font-bold text-emerald-500 font-display shrink-0 pl-4">
                    {currencySymbol} {savings.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick tips */}
            <div className="bg-base/50 border border-subtle p-4 rounded-[2rem] mt-6 flex gap-2.5 items-center">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <p className="text-[11px] text-main">
                Tu capacidad de ahorro recomendada para este ingreso mensual es de <strong>{currencySymbol} {savings.toLocaleString('es-PE', { maximumFractionDigits: 0 })}</strong>. ¡Intenta depositar esto directo a tu Meta de Ahorro!
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
