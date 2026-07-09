/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Transaction } from '../types';
import { 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText, 
  X,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TransactionsViewProps {
  transactions: Transaction[];
  currencySymbol: string;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (isOpen: boolean) => void;
}

const CATEGORIES = [
  "Comida",
  "Servicios",
  "Salario",
  "Entretenimiento",
  "Otros Ingresos",
  "Transporte",
  "Salud",
  "Educación",
  "Otros"
];

export default function TransactionsView({
  transactions,
  currencySymbol,
  onAddTransaction,
  onDeleteTransaction,
  isAddModalOpen,
  setIsAddModalOpen
}: TransactionsViewProps) {
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Comida');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || t.type === selectedType;
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!description.trim()) {
      setErrorMessage('Por favor ingresa una descripción.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Ingresa un monto válido mayor a 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddTransaction({
        description: description.trim(),
        amount: parsedAmount,
        date,
        category,
        type
      });
      // Reset form
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('Comida');
      setType('expense');
      setIsAddModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al agregar la transacción.');
    } finally {
      setIsSubmitting(false);
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
          <h1 className="text-3xl font-extrabold font-display tracking-tight text-main">Transacciones</h1>
          <p className="text-sm text-muted font-sans mt-1">Registra, administra y audita todos tus movimientos financieros</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-brand-primary hover:opacity-90 text-white dark:text-brand-dark px-5 py-2.5 rounded-full font-bold text-xs tracking-wide uppercase shadow-lg cursor-pointer transition-all transform active:scale-95"
        >
          <Plus size={14} />
          <span>Nueva Transacción</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card p-5 rounded-[2rem] border border-subtle shadow-xl flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted" />
          <input 
            type="text"
            placeholder="Buscar por descripción o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-base/50 border border-subtle rounded-xl text-sm text-main placeholder-muted focus:outline-none focus:border-brand-primary focus:bg-base transition-all font-sans"
          />
        </div>

        {/* Type Filter Tabs */}
        <div className="flex bg-base/60 p-1 rounded-xl border border-subtle w-full md:w-auto">
          {(['all', 'income', 'expense'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`flex-1 md:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedType === t 
                  ? 'bg-brand-primary text-white dark:text-brand-dark shadow-sm' 
                  : 'text-main/70 dark:text-muted hover:text-main'
              }`}
            >
              {t === 'all' ? 'Todos' : t === 'income' ? 'Ingresos' : 'Gastos'}
            </button>
          ))}
        </div>

        {/* Category Dropdown */}
        <div className="relative w-full md:w-48">
          <Filter size={14} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full pl-8 pr-3 py-2.5 bg-base/50 border border-subtle rounded-xl text-xs font-bold text-main focus:outline-none focus:border-brand-primary focus:bg-base transition-all appearance-none cursor-pointer"
          >
            <option value="all" className="bg-card text-main">Categorías (Todas)</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat} className="bg-card text-main">{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions List Card */}
      <div className="bg-card rounded-[2.5rem] border border-subtle shadow-xl overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="mx-auto w-12 h-12 bg-brand-primary/10 text-brand-primary border border-brand-primary/15 rounded-full flex items-center justify-center mb-4">
              <FileText size={24} />
            </div>
            <h3 className="text-sm font-bold text-main">Sin movimientos</h3>
            <p className="text-xs text-muted mt-1.5">No hay transacciones que coincidan con los filtros seleccionados.</p>
          </div>
        ) : (
          <div>
            {/* Mobile View: Cards List */}
            <div className="block md:hidden divide-y divide-subtle">
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-base/20 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 border ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                      {tx.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-main block truncate">
                        {tx.description}
                      </span>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] text-muted font-mono">{tx.date}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-brand-primary/10 text-brand-primary border border-brand-primary/15 rounded-md uppercase tracking-wider">
                          {tx.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    <span className={`text-sm font-extrabold font-display ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {tx.type === 'income' ? '+' : '-'}{currencySymbol} {tx.amount.toFixed(2)}
                    </span>
                    <button 
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="p-1.5 text-muted hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-lg transition-all cursor-pointer"
                      title="Eliminar transacción"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Tablet & Desktop View: Structured Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-base/40 text-[10px] font-bold text-muted uppercase tracking-widest border-b border-subtle">
                    <th className="py-4 px-6 font-mono">Detalle</th>
                    <th className="py-4 px-6 font-mono">Fecha</th>
                    <th className="py-4 px-6 font-mono">Categoría</th>
                    <th className="py-4 px-6 text-right font-mono">Monto</th>
                    <th className="py-4 px-6 text-center font-mono">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {filteredTransactions.map((tx) => (
                    <motion.tr 
                      key={tx.id}
                      layoutId={tx.id}
                      className="hover:bg-base/40 transition-all group"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl shrink-0 border ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                            {tx.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-main block group-hover:text-brand-primary transition-colors">
                              {tx.description}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-muted font-mono">
                        {tx.date}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-primary/10 text-brand-primary border border-brand-primary/15 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                          <Tag size={10} />
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-extrabold font-display text-sm">
                        <span className={tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}>
                          {tx.type === 'income' ? '+' : '-'}{currencySymbol} {tx.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button 
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-2 text-muted hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-xl transition-all md:opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                          title="Eliminar transacción"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Transaction Overlay Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-card w-full max-w-md p-8 rounded-[2.5rem] border border-subtle shadow-2xl z-10"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-brand-primary/10 text-brand-primary rounded-xl">
                    <PlusCircle size={20} />
                  </div>
                  <h3 className="text-lg font-bold font-display text-main">Nueva Transacción</h3>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 hover:bg-base rounded-lg text-muted hover:text-main transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                    {errorMessage}
                  </div>
                )}

                {/* Income / Expense Toggle */}
                <div className="flex p-1 bg-base border border-subtle rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setType('expense');
                      if (category === 'Salario' || category === 'Otros Ingresos') {
                        setCategory('Comida');
                      }
                    }}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      type === 'expense' 
                        ? 'bg-brand-primary text-brand-dark shadow-sm' 
                        : 'text-muted hover:text-main'
                    }`}
                  >
                    <TrendingDown size={14} />
                    Gastos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setType('income');
                      setCategory('Salario');
                    }}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      type === 'income' 
                        ? 'bg-brand-primary text-brand-dark shadow-sm' 
                        : 'text-muted hover:text-main'
                    }`}
                  >
                    <TrendingUp size={14} />
                    Ingresos
                  </button>
                </div>

                {/* Amount input */}
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5 font-mono">Monto ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-3.5 bg-base/50 border border-subtle rounded-xl text-lg font-bold text-main focus:outline-none focus:border-brand-primary focus:bg-base transition-all font-mono"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5 font-mono">Descripción</label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    placeholder="Ej. Súpermercado Metro"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-base/50 border border-subtle rounded-xl text-sm text-main placeholder-muted/50 focus:outline-none focus:border-brand-primary focus:bg-base transition-all font-sans"
                  />
                </div>

                {/* Category Selector */}
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5 font-mono">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-base/50 border border-subtle rounded-xl text-sm text-main focus:outline-none focus:border-brand-primary focus:bg-base transition-all cursor-pointer font-sans"
                  >
                    {type === 'expense' ? (
                      CATEGORIES.filter(cat => cat !== 'Salario' && cat !== 'Otros Ingresos').map(cat => (
                        <option key={cat} value={cat} className="bg-card text-main">{cat}</option>
                      ))
                    ) : (
                      CATEGORIES.filter(cat => cat === 'Salario' || cat === 'Otros Ingresos' || cat === 'Otros').map(cat => (
                        <option key={cat} value={cat} className="bg-card text-main">{cat}</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5 font-mono">Fecha</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-base/50 border border-subtle rounded-xl text-sm text-main focus:outline-none focus:border-brand-primary focus:bg-base transition-all font-mono"
                  />
                </div>

                {/* Action button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-3 py-3.5 bg-brand-primary hover:opacity-90 text-brand-dark text-xs font-bold rounded-full tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                >
                  {isSubmitting ? "Registrando..." : "Registrar Transacción"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
