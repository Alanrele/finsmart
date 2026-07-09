/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Transaction, SavingsGoal } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Activity, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ChevronRight, 
  PlusCircle,
  PiggyBank
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardViewProps {
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  currencySymbol: string;
  onAddTransactionClick: () => void;
  onNavigateToTab: (tabId: string) => void;
}

export default function DashboardView({ 
  transactions, 
  savingsGoals, 
  currencySymbol, 
  onAddTransactionClick,
  onNavigateToTab
}: DashboardViewProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Financial calculations
  const incomes = transactions.filter(t => t.type === 'income');
  const expenses = transactions.filter(t => t.type === 'expense');

  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
  const currentBalance = totalIncome - totalExpense;
  const transactionCount = transactions.length;

  // Group expenses by category
  const expensesByCategory: { [key: string]: number } = {};
  expenses.forEach(t => {
    expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
  });

  const totalExpenseForPie = Object.values(expensesByCategory).reduce((sum, v) => sum + v, 0) || 1;
  const categoriesList = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value,
    percentage: (value / totalExpenseForPie) * 100,
    color: name === 'Servicios' ? '#3B82F6' :      // Electric Blue
           name === 'Comida' ? '#10B981' :         // Vibrant Emerald Green
           name === 'Entretenimiento' ? '#F59E0B' : // Neon Amber
           name === 'Transporte' ? '#EC4899' :     // Hot Pink
           name === 'Salud' ? '#8B5CF6' :          // Violet
           name === 'Educación' ? '#06B6D4' :      // Bright Cyan
           '#A78BFA'                               // Amethyst/Others
  })).sort((a, b) => b.value - a.value);

  // Custom Interactive SVG Donut Chart Calculation
  let cumulativePercent = 0;
  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  // 7-day spending trend calculation
  const getPast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  };

  const last7Days = getPast7Days();
  const dailySpending = last7Days.map(date => {
    const dailyExpenses = expenses.filter(t => t.date === date);
    const sum = dailyExpenses.reduce((acc, t) => acc + t.amount, 0);
    // Format label to short string (e.g., "03/07")
    const [, month, day] = date.split('-');
    return {
      dateLabel: `${day}/${month}`,
      amount: sum
    };
  });

  const maxSpending = Math.max(...dailySpending.map(d => d.amount), 50);

  // Container variants for fluid staggered animation
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100 } }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight text-main">Panel Financiero</h1>
          <p className="text-sm text-muted font-sans mt-1">Resumen completo e inteligente de tus finanzas personales en Kipu</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onAddTransactionClick}
            className="flex items-center gap-2 bg-brand-primary hover:opacity-90 text-brand-dark px-5 py-2.5 rounded-full font-bold text-xs tracking-wide uppercase transition-all transform active:scale-95 cursor-pointer shadow-lg"
          >
            <PlusCircle size={14} />
            <span>Nueva Transacción</span>
          </button>
        </div>
      </div>

      {/* 4 Cards Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Expenses */}
        <motion.div 
          variants={itemVariants}
          className="bg-card/75 backdrop-blur-md p-6 rounded-[2rem] border border-subtle relative overflow-hidden flex flex-col justify-between h-36 shadow-xl animate-fade-in"
        >
          {/* Subtle ambient glow */}
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex justify-between items-start z-10">
            <div>
              <span className="text-[10px] font-extrabold text-muted uppercase tracking-widest block">Gasto Total</span>
              <h3 className="text-2xl md:text-3xl font-extrabold font-display text-main tracking-tight mt-1.5">
                {currencySymbol} {totalExpense.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl shadow-sm shrink-0">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-500 mt-3 z-10">
            <ArrowDownLeft size={14} className="animate-pulse" />
            <span className="tracking-wider text-[10px]">ESTE MES</span>
          </div>
        </motion.div>

        {/* Card 2: Income */}
        <motion.div 
          variants={itemVariants}
          className="bg-card/75 backdrop-blur-md p-6 rounded-[2rem] border border-subtle relative overflow-hidden flex flex-col justify-between h-36 shadow-xl"
        >
          {/* Subtle ambient glow */}
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

          <div className="flex justify-between items-start z-10">
            <div>
              <span className="text-[10px] font-extrabold text-muted uppercase tracking-widest block">Ingresos Totales</span>
              <h3 className="text-2xl md:text-3xl font-extrabold font-display text-main tracking-tight mt-1.5">
                {currencySymbol} {totalIncome.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-2xl shadow-sm shrink-0">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-500 mt-3 z-10">
            <ArrowUpRight size={14} className="animate-pulse" />
            <span className="tracking-wider text-[10px]">ESTE MES</span>
          </div>
        </motion.div>

        {/* Card 3: Balance */}
        <motion.div 
          variants={itemVariants}
          className="bg-card/75 backdrop-blur-md p-6 rounded-[2rem] border border-subtle relative overflow-hidden flex flex-col justify-between h-36 shadow-xl"
        >
          {/* Subtle ambient glow */}
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-brand-primary/15 rounded-full blur-2xl pointer-events-none" />

          <div className="flex justify-between items-start z-10">
            <div>
              <span className="text-[10px] font-extrabold text-muted uppercase tracking-widest block">Balance Actual</span>
              <h3 className={`text-2xl md:text-3xl font-extrabold font-display tracking-tight mt-1.5 ${currentBalance >= 0 ? 'text-main' : 'text-rose-500'}`}>
                {currentBalance < 0 ? '-' : ''}{currencySymbol} {Math.abs(currentBalance).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className={`p-2.5 rounded-2xl border shadow-sm shrink-0 ${currentBalance >= 0 ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
              <CreditCard size={18} />
            </div>
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-mono font-bold mt-3 z-10 ${currentBalance >= 0 ? 'text-brand-primary' : 'text-rose-500'}`}>
            <Activity size={14} />
            <span className="tracking-wider text-[10px]">{currentBalance >= 0 ? 'BALANCE POSITIVO' : 'BALANCE NEGATIVO'}</span>
          </div>
        </motion.div>

        {/* Card 4: Total Transactions */}
        <motion.div 
          variants={itemVariants}
          className="bg-card/75 backdrop-blur-md p-6 rounded-[2rem] border border-subtle relative overflow-hidden flex flex-col justify-between h-36 shadow-xl"
        >
          {/* Subtle ambient glow */}
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-brand-primary/15 rounded-full blur-2xl pointer-events-none" />

          <div className="flex justify-between items-start z-10">
            <div>
              <span className="text-[10px] font-extrabold text-muted uppercase tracking-widest block">Transacciones</span>
              <h3 className="text-2xl md:text-3xl font-extrabold font-display text-main tracking-tight mt-1.5">
                {transactionCount}
              </h3>
            </div>
            <div className="p-2.5 bg-brand-primary/10 text-brand-primary border border-brand-primary/15 rounded-2xl shadow-sm shrink-0">
              <Calendar size={18} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-muted mt-3 z-10">
            <span className="tracking-wider text-[10px]">HISTORIAL COMPLETO</span>
          </div>
        </motion.div>
      </div>

      {/* Main split grid: Pie Chart & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Expenses - Pie Chart */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-5 bg-card p-8 rounded-[2.5rem] border border-subtle flex flex-col shadow-xl"
        >
          <h2 className="text-lg font-serif italic text-main mb-6">Gastos por Categoría</h2>
          
          <div className="flex-1 flex flex-col items-center justify-center py-2">
            {categoriesList.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted">No hay gastos registrados este mes</p>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center gap-6">
                {/* SVG Donut Center */}
                <div className="relative w-44 h-44">
                  <svg className="w-full h-full transform -rotate-90" viewBox="-1 -1 2 2">
                    {/* Background circle */}
                    <circle cx="0" cy="0" r="0.75" fill="none" stroke="var(--border-subtle)" strokeWidth="0.25" />
                    
                    {/* Interactive Donut Slices */}
                    {(() => {
                      let localCumulativePercent = 0;
                      return categoriesList.map((category, idx) => {
                        const startPercent = localCumulativePercent;
                        const endPercent = localCumulativePercent + (category.percentage / 100);
                        localCumulativePercent = endPercent;

                        // Calculate SVG path
                        const start = getCoordinatesForPercent(startPercent);
                        const end = getCoordinatesForPercent(endPercent);

                      const pathData = [
                        `M ${start[0] * 0.75} ${start[1] * 0.75}`,
                        `A 0.75 0.75 0 0 1 ${end[0] * 0.75} ${end[1] * 0.75}`,
                        `L ${end[0] * 0.6} ${end[1] * 0.6}`,
                        `A 0.6 0.6 0 0 0 ${start[0] * 0.6} ${start[1] * 0.6}`,
                        'Z'
                      ].join(' ');

                      const isHovered = hoveredCategory === category.name;

                      return (
                        <path
                          key={category.name}
                          d={pathData}
                          fill={category.color}
                          className="transition-all cursor-pointer outline-none"
                          style={{
                            transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                            transformOrigin: '0 0',
                            filter: isHovered ? 'brightness(1.1) drop-shadow(0px 8px 12px rgba(167,158,130,0.08))' : 'none'
                          }}
                          onMouseEnter={() => setHoveredCategory(category.name)}
                          onMouseLeave={() => setHoveredCategory(null)}
                        />
                      );
                    });
                  })()}
                  </svg>
                  {/* Center Info text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-[10px] text-muted font-mono uppercase font-bold tracking-widest">Total</span>
                    <span className="text-xl font-bold font-display text-main mt-1">
                      {currencySymbol}{totalExpense.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {/* Categorized list items */}
                <div className="w-full space-y-1.5 mt-2 max-h-[160px] overflow-y-auto pr-1">
                  {categoriesList.map((category) => (
                    <div 
                      key={category.name}
                      className={`flex items-center justify-between p-2 rounded-xl transition-all ${hoveredCategory === category.name ? 'bg-base/60' : ''}`}
                      onMouseEnter={() => setHoveredCategory(category.name)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    >
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm font-medium text-main">{category.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-main">
                          {currencySymbol} {category.value.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-muted block font-mono">
                          {category.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Transactions list */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-7 bg-card p-8 rounded-[2.5rem] border border-subtle flex flex-col justify-between shadow-xl"
        >
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-serif italic text-main">Transacciones Recientes</h2>
              <button 
                onClick={() => onNavigateToTab('Transacciones')}
                className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-main transition-colors cursor-pointer underline"
              >
                <span>Ver todas</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted">No hay transacciones registradas</p>
              </div>
            ) : (
              <div className="divide-y divide-subtle max-h-[300px] overflow-y-auto pr-1">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3.5 group hover:bg-base/40 px-2.5 rounded-2xl transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                        {tx.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-main transition-colors">{tx.description}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted font-mono">{tx.date}</span>
                          <span className="w-1 h-1 rounded-full bg-brand-primary/20" />
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-brand-primary/10 text-brand-primary border border-brand-primary/15 rounded-md uppercase tracking-wider">
                            {tx.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-sm font-bold font-display ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {tx.type === 'income' ? '+' : '-'}{currencySymbol} {tx.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Saving Goal Progress Snippet */}
          {savingsGoals.length > 0 && (
            <div className="border-t border-subtle pt-5 mt-5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest font-mono">Progreso de Ahorro Destacado</span>
                <button 
                  onClick={() => onNavigateToTab('Asistente IA+')}
                  className="text-xs font-semibold text-muted hover:text-main transition-colors"
                >
                  Ver Metas
                </button>
              </div>
              <div className="flex items-center gap-3 bg-base/50 p-4 rounded-3xl border border-subtle">
                <div className="p-2.5 bg-brand-primary/15 text-brand-primary rounded-xl">
                  <PiggyBank size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center text-xs font-semibold text-main mb-1.5">
                    <span className="truncate font-medium">{savingsGoals[0].name}</span>
                    <span className="font-mono">
                      {currencySymbol}{savingsGoals[0].current} / {currencySymbol}{savingsGoals[0].target}
                    </span>
                  </div>
                  <div className="w-full bg-brand-primary/15 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-brand-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (savingsGoals[0].current / savingsGoals[0].target) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Tendencia de Gastos Chart Card */}
      <motion.div 
        variants={itemVariants}
        className="bg-card p-8 rounded-[2.5rem] border border-subtle shadow-xl"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-serif italic text-main">Tendencia de Gastos</h2>
            <p className="text-xs text-muted mt-1 font-sans">Gastos diarios en los últimos 7 días</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-brand-primary/10 text-brand-primary border border-brand-primary/15 rounded-lg">
            {currencySymbol === 'S/' ? 'Soles (S/)' : currencySymbol === '$' ? 'Dólares ($)' : currencySymbol === '€' ? 'Euros (€)' : `Moneda (${currencySymbol})`}
          </span>
        </div>

        {/* Custom SVG/Bar Chart */}
        <div className="h-44 flex items-end gap-3 sm:gap-6 pt-4 w-full justify-between px-2">
          {dailySpending.map((day, idx) => {
            const heightPercent = day.amount > 0 ? (day.amount / maxSpending) * 100 : 2;
            return (
              <div key={day.dateLabel} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                <div className="relative w-full flex justify-center items-end h-32">
                  {/* Tooltip bubble */}
                  <div className="absolute bottom-full mb-1 bg-brand-primary text-brand-dark text-[10px] font-mono font-bold px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                    {currencySymbol} {day.amount.toFixed(2)}
                  </div>
                  
                  {/* Rounded Bar */}
                  <div 
                    className="w-full max-w-[28px] bg-base/60 group-hover:bg-base rounded-t-lg transition-all"
                    style={{ height: '100%' }}
                  >
                    <motion.div 
                      className="w-full bg-brand-primary group-hover:opacity-90 rounded-t-lg shadow-md"
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercent}%` }}
                      transition={{ type: 'spring' as const, delay: idx * 0.05, stiffness: 80 }}
                    />
                  </div>
                </div>
                <span className="text-xs font-bold text-muted group-hover:text-main transition-colors">
                  {day.dateLabel}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
