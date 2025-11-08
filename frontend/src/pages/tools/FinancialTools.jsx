import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calculator,
  TrendingUp,
  PiggyBank,
  Target,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Trophy,
  Zap
} from 'lucide-react';
import { formatCurrency } from '@shared/lib/formatters';
import toast from 'react-hot-toast';

const FinancialTools = () => {
  const [activeTab, setActiveTab] = useState('health');

  // Financial Health Score Calculator
  const [healthInputs, setHealthInputs] = useState({
    monthlyIncome: '',
    monthlyExpenses: '',
    savings: '',
    debts: '',
    emergencyFund: ''
  });
  const [healthScore, setHealthScore] = useState(null);

  // Budget Tracker
  const [budgets, setBudgets] = useState([
    { category: 'food', name: 'Comida', budget: 1000, spent: 0 },
    { category: 'transport', name: 'Transporte', budget: 500, spent: 0 },
    { category: 'entertainment', name: 'Entretenimiento', budget: 300, spent: 0 },
    { category: 'utilities', name: 'Servicios', budget: 400, spent: 0 }
  ]);

  // Savings Goal
  const [savingsGoal, setSavingsGoal] = useState({
    target: '',
    current: '',
    deadline: '',
    monthlyContribution: ''
  });

  // Debt Payoff Calculator
  const [debtInputs, setDebtInputs] = useState({
    principal: '',
    interestRate: '',
    monthlyPayment: ''
  });
  const [debtResults, setDebtResults] = useState(null);

  // Calculate Financial Health Score
  const calculateHealthScore = () => {
    const income = parseFloat(healthInputs.monthlyIncome) || 0;
    const expenses = parseFloat(healthInputs.monthlyExpenses) || 0;
    const savings = parseFloat(healthInputs.savings) || 0;
    const debts = parseFloat(healthInputs.debts) || 0;
    const emergency = parseFloat(healthInputs.emergencyFund) || 0;

    if (income === 0) {
      toast.error('Por favor ingresa tus ingresos mensuales');
      return;
    }

    // Scoring algorithm
    let score = 0;

    // 1. Savings Rate (25 points)
    const savingsRate = ((income - expenses) / income) * 100;
    if (savingsRate >= 30) score += 25;
    else if (savingsRate >= 20) score += 20;
    else if (savingsRate >= 10) score += 15;
    else if (savingsRate > 0) score += 10;

    // 2. Emergency Fund (25 points)
    const monthsOfExpenses = emergency / expenses;
    if (monthsOfExpenses >= 6) score += 25;
    else if (monthsOfExpenses >= 3) score += 20;
    else if (monthsOfExpenses >= 1) score += 15;
    else if (monthsOfExpenses > 0) score += 10;

    // 3. Debt to Income Ratio (25 points)
    const debtRatio = (debts / income) * 100;
    if (debtRatio === 0) score += 25;
    else if (debtRatio < 20) score += 20;
    else if (debtRatio < 30) score += 15;
    else if (debtRatio < 40) score += 10;
    else score += 5;

    // 4. Expense Management (25 points)
    const expenseRatio = (expenses / income) * 100;
    if (expenseRatio < 50) score += 25;
    else if (expenseRatio < 70) score += 20;
    else if (expenseRatio < 80) score += 15;
    else if (expenseRatio < 90) score += 10;
    else score += 5;

    setHealthScore({
      total: score,
      savingsRate: savingsRate.toFixed(1),
      emergencyMonths: monthsOfExpenses.toFixed(1),
      debtRatio: debtRatio.toFixed(1),
      expenseRatio: expenseRatio.toFixed(1),
      level: score >= 80 ? 'Excelente' : score >= 60 ? 'Buena' : score >= 40 ? 'Regular' : 'Necesita Mejora'
    });

    toast.success('¡Puntuación calculada!');
  };

  // Calculate Debt Payoff
  const calculateDebtPayoff = () => {
    const principal = parseFloat(debtInputs.principal) || 0;
    const rate = (parseFloat(debtInputs.interestRate) || 0) / 100 / 12;
    const payment = parseFloat(debtInputs.monthlyPayment) || 0;

    if (principal === 0 || payment === 0) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    if (payment <= principal * rate) {
      toast.error('El pago mensual es muy bajo para cubrir los intereses');
      return;
    }

    // Calculate months to payoff
    const months = Math.ceil(
      -Math.log(1 - (principal * rate) / payment) / Math.log(1 + rate)
    );

    const totalPaid = payment * months;
    const totalInterest = totalPaid - principal;

    setDebtResults({
      months,
      years: (months / 12).toFixed(1),
      totalPaid,
      totalInterest,
      interestPercentage: ((totalInterest / principal) * 100).toFixed(1)
    });

    toast.success('¡Cálculo completado!');
  };

  // Calculate Savings Goal Progress
  const calculateSavingsProgress = () => {
    const target = parseFloat(savingsGoal.target) || 0;
    const current = parseFloat(savingsGoal.current) || 0;
    const contribution = parseFloat(savingsGoal.monthlyContribution) || 0;

    if (target === 0) return 0;

    const remaining = target - current;
    const monthsNeeded = contribution > 0 ? Math.ceil(remaining / contribution) : 0;

    return {
      percentage: ((current / target) * 100).toFixed(1),
      remaining,
      monthsNeeded,
      targetDate: monthsNeeded > 0 ? new Date(Date.now() + monthsNeeded * 30 * 24 * 60 * 60 * 1000).toLocaleDateString() : null
    };
  };

  const tabs = [
    { id: 'health', name: 'Salud Financiera', icon: Trophy },
    { id: 'budget', name: 'Presupuesto', icon: Calculator },
    { id: 'savings', name: 'Metas de Ahorro', icon: PiggyBank },
    { id: 'debt', name: 'Pago de Deudas', icon: DollarSign }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          Herramientas Financieras
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Calculadoras y herramientas para mejorar tu salud financiera
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-[#C6A664] to-[#8B7355] text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-[#C6A664]/20 dark:hover:bg-[#C6A664]/30'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="font-medium">{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Financial Health Score */}
      {activeTab === 'health' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
              Calculadora de Salud Financiera
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ingresos Mensuales
                </label>
                <input
                  type="number"
                  value={healthInputs.monthlyIncome}
                  onChange={(e) => setHealthInputs({ ...healthInputs, monthlyIncome: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="S/ 0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gastos Mensuales
                </label>
                <input
                  type="number"
                  value={healthInputs.monthlyExpenses}
                  onChange={(e) => setHealthInputs({ ...healthInputs, monthlyExpenses: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="S/ 0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ahorros Totales
                </label>
                <input
                  type="number"
                  value={healthInputs.savings}
                  onChange={(e) => setHealthInputs({ ...healthInputs, savings: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="S/ 0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Deudas Totales
                </label>
                <input
                  type="number"
                  value={healthInputs.debts}
                  onChange={(e) => setHealthInputs({ ...healthInputs, debts: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="S/ 0.00"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fondo de Emergencia
                </label>
                <input
                  type="number"
                  value={healthInputs.emergencyFund}
                  onChange={(e) => setHealthInputs({ ...healthInputs, emergencyFund: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="S/ 0.00"
                />
              </div>
            </div>

            <button
              onClick={calculateHealthScore}
              className="btn-primary w-full"
            >
              Calcular Puntuación
            </button>

            {healthScore && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 p-6 bg-gradient-to-br from-[#C6A664]/20 to-[#8B7355]/20 dark:from-[#C6A664]/20 dark:to-[#8B7355]/20 rounded-xl border border-[#C6A664]/30"
              >
                <div className="text-center mb-6">
                  <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full text-4xl font-bold shadow-lg ${
                    healthScore.total >= 80
                      ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                      : healthScore.total >= 60
                      ? 'bg-gradient-to-br from-[#C6A664] to-[#8B7355] text-white'
                      : healthScore.total >= 40
                      ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white'
                      : 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                  }`}>
                    {healthScore.total}
                  </div>
                  <p className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                    {healthScore.level}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{healthScore.savingsRate}%</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tasa de Ahorro</p>
                  </div>
                  <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{healthScore.emergencyMonths}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Meses de Emergencia</p>
                  </div>
                  <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{healthScore.debtRatio}%</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Ratio de Deuda</p>
                  </div>
                  <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{healthScore.expenseRatio}%</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Ratio de Gastos</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Budget Tracker */}
      {activeTab === 'budget' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Calculator className="w-5 h-5 mr-2 text-blue-500" />
            Seguimiento de Presupuesto
          </h3>

          <div className="space-y-4">
            {budgets.map((budget, index) => {
              const percentage = (budget.spent / budget.budget) * 100;
              const isOverBudget = percentage > 100;

              return (
                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {budget.name}
                    </span>
                    <span className={`font-semibold ${
                      isOverBudget ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(budget.spent)} / {formatCurrency(budget.budget)}
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        isOverBudget ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {percentage.toFixed(1)}% usado
                    </span>
                    {isOverBudget && (
                      <span className="text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        Sobre presupuesto
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Savings Goal */}
      {activeTab === 'savings' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <PiggyBank className="w-5 h-5 mr-2 text-pink-500" />
            Metas de Ahorro
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Meta de Ahorro
              </label>
              <input
                type="number"
                value={savingsGoal.target}
                onChange={(e) => setSavingsGoal({ ...savingsGoal, target: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="S/ 0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ahorro Actual
              </label>
              <input
                type="number"
                value={savingsGoal.current}
                onChange={(e) => setSavingsGoal({ ...savingsGoal, current: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="S/ 0.00"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contribución Mensual
              </label>
              <input
                type="number"
                value={savingsGoal.monthlyContribution}
                onChange={(e) => setSavingsGoal({ ...savingsGoal, monthlyContribution: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="S/ 0.00"
              />
            </div>
          </div>

          {savingsGoal.target && savingsGoal.current && (() => {
            const progress = calculateSavingsProgress();
            return (
              <div className="p-6 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-xl">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Progreso
                    </span>
                    <span className="text-sm font-bold text-pink-600">
                      {progress.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4">
                    <div
                      className="bg-gradient-to-r from-pink-500 to-purple-500 h-4 rounded-full transition-all"
                      style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <p className="text-xl font-bold text-pink-600">
                      {formatCurrency(progress.remaining)}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Falta</p>
                  </div>
                  {progress.monthsNeeded > 0 && (
                    <>
                      <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <p className="text-xl font-bold text-purple-600">
                          {progress.monthsNeeded}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Meses</p>
                      </div>
                      <div className="col-span-2 text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Fecha estimada de logro:
                        </p>
                        <p className="text-lg font-bold text-blue-600">
                          {progress.targetDate}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* Debt Payoff */}
      {activeTab === 'debt' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-green-500" />
            Calculadora de Pago de Deudas
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Monto de la Deuda
              </label>
              <input
                type="number"
                value={debtInputs.principal}
                onChange={(e) => setDebtInputs({ ...debtInputs, principal: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="S/ 0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tasa de Interés Anual (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={debtInputs.interestRate}
                onChange={(e) => setDebtInputs({ ...debtInputs, interestRate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pago Mensual
              </label>
              <input
                type="number"
                value={debtInputs.monthlyPayment}
                onChange={(e) => setDebtInputs({ ...debtInputs, monthlyPayment: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="S/ 0.00"
              />
            </div>
          </div>

          <button
            onClick={calculateDebtPayoff}
            className="btn-primary w-full mb-6"
          >
            Calcular Tiempo de Pago
          </button>

          {debtResults && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{debtResults.months}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Meses para pagar</p>
                </div>
                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">{debtResults.years}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Años</p>
                </div>
                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-xl font-bold text-orange-600">
                    {formatCurrency(debtResults.totalInterest)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Interés Total</p>
                </div>
                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-xl font-bold text-purple-600">
                    {formatCurrency(debtResults.totalPaid)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total a Pagar</p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Pagarás un {debtResults.interestPercentage}% adicional en intereses
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      Aumenta tu pago mensual para reducir el tiempo y los intereses totales
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default FinancialTools;
