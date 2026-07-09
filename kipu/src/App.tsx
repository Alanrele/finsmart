/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Transaction, SavingsGoal, ChatMessage } from './types';
import DashboardView from './components/DashboardView';
import TransactionsView from './components/TransactionsView';
import AnalysisView from './components/AnalysisView';
import ChatView from './components/ChatView';
import AssistantView from './components/AssistantView';
import ToolsView from './components/ToolsView';
import OutlookView from './components/OutlookView';
import SettingsView from './components/SettingsView';

import { 
  LayoutDashboard, 
  Receipt, 
  Sparkles, 
  MessageSquareCode, 
  PiggyBank, 
  Calculator, 
  Mail, 
  Settings as SettingsIcon,
  Menu,
  X,
  CreditCard,
  UserCheck,
  Sun,
  Moon,
  MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type TabType = 'Dashboard' | 'Transacciones' | 'Análisis' | 'Chat IA' | 'Asistente IA+' | 'Herramientas' | 'Outlook' | 'Configuración';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('kipu-theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('kipu-theme', theme);
  }, [theme]);

  const [activeTab, setActiveTab] = useState<TabType>('Dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState('S/');
  
  // App navigation drawer for mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // State for Add Transaction modal (triggered from Dashboard or Transactions)
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isChatSending, setIsChatSending] = useState(false);

  // Sync state loading
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Fetch initial data
  const fetchData = async () => {
    try {
      const [txRes, goalsRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/goals')
      ]);

      if (txRes.ok && goalsRes.ok) {
        const txData = await txRes.json();
        const goalsData = await goalsRes.json();
        setTransactions(txData);
        setSavingsGoals(goalsData);
      }
    } catch (err) {
      console.error('Error al precargar información financiera Kipu:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Transaction Actions
  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTx)
      });
      if (res.ok) {
        const savedTx = await res.json();
        setTransactions(prev => [savedTx, ...prev]);
      } else {
        throw new Error('Error al registrar movimiento en el servidor.');
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const res = await fetch(`/api/transactions?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setTransactions(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Savings Goals Actions
  const handleAddGoal = async (newGoal: Omit<SavingsGoal, 'id'>) => {
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGoal)
      });
      if (res.ok) {
        const savedGoal = await res.json();
        setSavingsGoals(prev => [...prev, savedGoal]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSavings = async (id: string, amount: number) => {
    try {
      const res = await fetch(`/api/goals/${id}/add-savings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      if (res.ok) {
        const updatedGoal = await res.json();
        setSavingsGoals(prev => prev.map(g => g.id === id ? updatedGoal : g));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      const res = await fetch(`/api/goals?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSavingsGoals(prev => prev.filter(g => g.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Chat Actions
  const handleSendMessage = async (text: string) => {
    // 1. Add User Message
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    };
    setChatHistory(prev => [...prev, userMsg]);
    setIsChatSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      if (res.ok) {
        const data = await res.json();
        const kipuMsg: ChatMessage = {
          id: `msg-${Date.now()}-kipu`,
          sender: 'kipu',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
        };
        setChatHistory(prev => [...prev, kipuMsg]);
      }
    } catch (err) {
      console.error('Error al dialogar con Kipu AI:', err);
    } finally {
      setIsChatSending(false);
    }
  };

  // Clear Database
  const handleClearData = async () => {
    try {
      const res = await fetch('/api/reset-data', { method: 'POST' });
      if (res.ok) {
        setTransactions([]);
        setSavingsGoals([]);
        setChatHistory([]);
        setActiveTab('Dashboard');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sidebarItems = [
    { name: 'Dashboard' as TabType, icon: LayoutDashboard },
    { name: 'Transacciones' as TabType, icon: Receipt },
    { name: 'Análisis' as TabType, icon: Sparkles },
    { name: 'Chat IA' as TabType, icon: MessageSquareCode },
    { name: 'Asistente IA+' as TabType, icon: PiggyBank },
    { name: 'Herramientas' as TabType, icon: Calculator },
    { name: 'Outlook' as TabType, icon: Mail },
    { name: 'Configuración' as TabType, icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-base text-main flex font-sans antialiased overflow-x-hidden selection:bg-brand-primary selection:text-brand-dark">
      {/* 1. Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-sidebar border-r border-subtle shrink-0 fixed top-0 bottom-0 left-0 z-30">
        {/* Brand Header */}
        <div className="p-8 border-b border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-primary text-brand-dark font-extrabold flex items-center justify-center text-xl shadow-lg shadow-brand-primary/10 tracking-wider font-display select-none">
              K
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-main font-display">Kipu</span>
              <span className="text-[10px] text-muted font-mono block tracking-widest mt-0.5">PLATINUM SECURE</span>
            </div>
          </div>
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 hover:bg-card rounded-xl text-muted hover:text-main transition-all cursor-pointer"
            title="Cambiar Tema"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {sidebarItems.map((item) => {
            const IconComp = item.icon;
            const isSelected = activeTab === item.name;
            return (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-brand-primary text-white dark:bg-brand-primary/15 dark:text-brand-primary border border-brand-primary/25 shadow-sm' 
                    : 'text-main/85 hover:text-main hover:bg-white/60 dark:text-muted dark:hover:text-main dark:hover:bg-card/50 border border-transparent'
                }`}
              >
                <IconComp size={16} className={isSelected ? 'text-white dark:text-brand-primary' : 'text-main/70 dark:text-muted group-hover:text-main'} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Premium footer card */}
        <div className="p-6 border-t border-subtle">
          <div className="bg-card/45 backdrop-blur-md p-4 rounded-full border border-subtle flex items-center gap-3.5 shadow-lg">
            <div className="w-10 h-10 rounded-full bg-brand-primary/25 text-brand-primary border border-brand-primary/20 flex items-center justify-center shrink-0">
              <UserCheck size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-main block uppercase tracking-wider">Kipu Platinum</span>
              <span className="text-[9px] text-muted font-mono tracking-widest uppercase block mt-0.5">MEMBER NO. 1004</span>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Frame Area */}
      <div className="flex-1 flex flex-col lg:pl-72 min-w-0">
        {/* Top Header Mobile */}
        <header className="lg:hidden h-16 bg-card/65 backdrop-blur-xl border-b border-subtle px-5 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-primary text-brand-dark font-extrabold flex items-center justify-center text-sm shadow-md font-display">
              K
            </div>
            <div>
              <span className="font-extrabold text-main tracking-tight font-display text-md">Kipu</span>
              <span className="text-[8px] text-brand-primary font-mono tracking-widest uppercase block -mt-0.5 font-bold">Secure AI</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 text-muted hover:text-main hover:bg-card/40 rounded-xl transition-all cursor-pointer"
              title="Cambiar Tema"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </header>

        {/* Primary View Router Grid */}
        <main className="flex-1 p-4 sm:p-10 max-w-7xl w-full mx-auto pb-32 lg:pb-24">
          {loadingInitial ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 border-4 border-brand-primary/10 border-t-brand-primary rounded-full animate-spin mb-4" />
              <span className="text-xs text-muted font-mono uppercase tracking-widest">Iniciando Kipu Core...</span>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                {activeTab === 'Dashboard' && (
                  <DashboardView 
                    transactions={transactions}
                    savingsGoals={savingsGoals}
                    currencySymbol={currencySymbol}
                    onAddTransactionClick={() => setIsAddTransactionOpen(true)}
                    onNavigateToTab={(tabId) => setActiveTab(tabId as TabType)}
                  />
                )}
                {activeTab === 'Transacciones' && (
                  <TransactionsView 
                    transactions={transactions}
                    currencySymbol={currencySymbol}
                    onAddTransaction={handleAddTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                    isAddModalOpen={isAddTransactionOpen}
                    setIsAddModalOpen={setIsAddTransactionOpen}
                  />
                )}
                {activeTab === 'Análisis' && (
                  <AnalysisView 
                    transactions={transactions}
                    currencySymbol={currencySymbol}
                  />
                )}
                {activeTab === 'Chat IA' && (
                  <ChatView 
                    chatHistory={chatHistory}
                    onSendMessage={handleSendMessage}
                    isSending={isChatSending}
                  />
                )}
                {activeTab === 'Asistente IA+' && (
                  <AssistantView 
                    savingsGoals={savingsGoals}
                    currencySymbol={currencySymbol}
                    onAddGoal={handleAddGoal}
                    onAddSavings={handleAddSavings}
                    onDeleteGoal={handleDeleteGoal}
                  />
                )}
                {activeTab === 'Herramientas' && (
                  <ToolsView 
                    currencySymbol={currencySymbol}
                  />
                )}
                {activeTab === 'Outlook' && (
                  <OutlookView 
                    onAddTransaction={handleAddTransaction}
                    currencySymbol={currencySymbol}
                  />
                )}
                {activeTab === 'Configuración' && (
                  <SettingsView 
                    currencySymbol={currencySymbol}
                    setCurrencySymbol={setCurrencySymbol}
                    onClearData={handleClearData}
                    transactions={transactions}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        {/* Floating Bottom Navigation Bar for Mobile Devices */}
        <div className="lg:hidden fixed bottom-5 left-4 right-4 z-40">
          <div className="bg-card/75 backdrop-blur-2xl border border-subtle shadow-2xl rounded-3xl px-3 py-1.5 flex items-center justify-between max-w-lg mx-auto">
            {[
              { id: 'Dashboard', label: 'Inicio', icon: LayoutDashboard },
              { id: 'Transacciones', label: 'Historial', icon: Receipt },
              { id: 'Chat IA', label: 'Kipu AI', icon: MessageSquareCode },
              { id: 'Asistente IA+', label: 'Metas', icon: PiggyBank },
              { id: 'Menu', label: 'Más', icon: MoreHorizontal, onClick: () => setIsMobileMenuOpen(true) }
            ].map((tabItem) => {
              const isSelected = activeTab === tabItem.id;
              const IconComp = tabItem.icon;
              return (
                <button
                  key={tabItem.id}
                  onClick={tabItem.onClick ? tabItem.onClick : () => setActiveTab(tabItem.id as TabType)}
                  className="flex-1 flex flex-col items-center justify-center py-1 relative cursor-pointer"
                >
                  <div className={`p-2 rounded-2xl transition-all duration-300 relative ${
                    isSelected 
                      ? 'text-brand-primary bg-brand-primary/15 dark:bg-brand-primary/10 scale-110' 
                      : 'text-main/65 dark:text-muted hover:text-main'
                  }`}>
                    <IconComp size={20} />
                    
                    {isSelected && (
                      <motion.div 
                        layoutId="activeIndicator"
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-primary"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </div>
                  <span className={`text-[9px] font-extrabold tracking-tight mt-0.5 transition-all ${
                    isSelected ? 'text-brand-primary' : 'text-main/75 dark:text-muted'
                  }`}>
                    {tabItem.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Slide-out Navigation Drawer Overlay for Mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/45 backdrop-blur-[1.5px]"
            />

            {/* Menu Body */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-80 max-w-full bg-sidebar/50 backdrop-blur-xl border-l border-subtle h-full p-8 flex flex-col justify-between shadow-2xl z-10"
            >
              <div>
                <div className="flex justify-between items-center mb-10 pb-4 border-b border-subtle">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-primary text-brand-dark font-extrabold flex items-center justify-center font-display text-lg shadow-md select-none">
                      K
                    </div>
                    <span className="font-extrabold text-main tracking-tight font-display text-xl">Kipu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Theme Toggle inside drawer */}
                    <button
                      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                      className="p-2 hover:bg-card/40 rounded-xl text-muted hover:text-main transition-all cursor-pointer"
                      title="Cambiar Tema"
                    >
                      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                    </button>
                    {/* Close button */}
                    <button 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2 hover:bg-card/40 rounded-xl text-muted hover:text-main transition-all cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <nav className="space-y-2">
                  {sidebarItems.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = activeTab === item.name;
                    return (
                      <button
                        key={item.name}
                        onClick={() => {
                          setActiveTab(item.name);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-brand-primary text-white dark:bg-brand-primary/20 dark:text-brand-primary border border-brand-primary/30 shadow-md' 
                            : 'text-main/85 hover:text-main hover:bg-white/60 dark:text-muted dark:hover:text-main dark:hover:bg-card/40'
                        }`}
                      >
                        <IconComp size={16} className={isSelected ? 'text-white dark:text-brand-primary' : 'text-main/70 dark:text-muted'} />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Sidebar Mobile Footer */}
              <div className="bg-card/40 backdrop-blur-md p-4 rounded-full border border-subtle flex items-center gap-3.5 shadow-lg">
                <div className="w-10 h-10 rounded-full bg-brand-primary/25 text-brand-primary border border-brand-primary/20 flex items-center justify-center shrink-0">
                  <UserCheck size={18} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold text-main block uppercase tracking-wider">Kipu Platinum</span>
                  <span className="text-[9px] text-muted font-mono tracking-widest uppercase block mt-0.5">MEMBER NO. 1004</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
