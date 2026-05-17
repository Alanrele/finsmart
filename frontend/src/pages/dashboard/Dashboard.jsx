import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Target,
  PieChart as PieChartIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  Sector
} from 'recharts';
import useAppStore from '@entities/app/model/appStore';
import { getDashboardData } from '@shared/api/base';
import toast from 'react-hot-toast';
import LoadingCard from '@shared/ui/LoadingCard';
import EmailSyncControl from '@widgets/email-sync-control/EmailSyncControl';
import { formatCurrency, formatCurrencyAuto, formatCurrencyUltraCompact, formatNumber, formatPercentage } from '@shared/lib/formatters';

import {
  Enhanced3DDonutChart,
  EnhancedBarChart,
  IncomeExpenseAreaChart,
  FinancialHealthRadar,
  MonthOverMonthComparison
} from '@widgets/charts/EnhancedCharts';

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-2 rounded shadow-lg border border-slate-200 dark:border-slate-700">
        <p className="text-sm font-medium text-slate-900 dark:text-white">{`${payload[0].name}: ${formatCurrency(payload[0].value)}`}</p>
        <p className="text-xs text-slate-500">{`Porcentaje: ${payload[0].payload.percentage.toFixed(1)}%`}</p>
      </div>
    );
  }

  return null;
};

class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    console.error('Chart render error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return <div className="text-sm text-slate-500 dark:text-slate-400">No se pudo renderizar el gráfico.</div>
    }
    return this.props.children
  }
}

const Dashboard = () => {
  const { dashboardData, setDashboardData } = useAppStore();
  const [loading, setLoading] = useState(true);
  const currentPeriod = useMemo(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }, []);
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod);

  const loadDashboardData = useCallback(async (period) => {
    if (!period) return;
    try {
      setLoading(true);
      const data = await getDashboardData({ month: period.month, year: period.year });
      setDashboardData(data);

      if (data?.period?.month && data?.period?.year) {
        const normalized = {
          month: data.period.month,
          year: data.period.year,
        };
        if (normalized.month !== period.month || normalized.year !== period.year) {
          setSelectedPeriod(normalized);
        }
      }
    } catch (error) {
      console.error('Dashboard loading error:', error);
      toast.error(error.message || 'Error al cargar los datos del panel.');
      setDashboardData({
        summary: {},
        categorySpending: [],
        topCategories: [],
        recentTransactions: [],
      });
    } finally {
      setLoading(false);
    }
  }, [setDashboardData, setSelectedPeriod]);

  useEffect(() => {
    loadDashboardData(selectedPeriod);
  }, [selectedPeriod, loadDashboardData]);

  const [activeSlice, setActiveSlice] = useState(-1)
  const [pieKey, setPieKey] = useState(0)
  const isCurrentPeriod =
    selectedPeriod.year === currentPeriod.year &&
    selectedPeriod.month === currentPeriod.month

  const formattedSelectedPeriod = useMemo(() => {
    const formatter = new Date(selectedPeriod.year, selectedPeriod.month - 1, 1)
      .toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
    return formatter.charAt(0).toUpperCase() + formatter.slice(1)
  }, [selectedPeriod])

  const handlePrevPeriod = () => {
    setSelectedPeriod((prev) => {
      const month = prev.month === 1 ? 12 : prev.month - 1
      const year = prev.month === 1 ? prev.year - 1 : prev.year
      return { month, year }
    })
  }

  const handleNextPeriod = () => {
    if (isCurrentPeriod) return
    setSelectedPeriod((prev) => {
      const month = prev.month === 12 ? 1 : prev.month + 1
      const year = prev.month === 12 ? prev.year + 1 : prev.year
      if (
        year > currentPeriod.year ||
        (year === currentPeriod.year && month > currentPeriod.month)
      ) {
        return currentPeriod
      }
      return { month, year }
    })
  }

  const handleRefresh = () => {
    loadDashboardData(selectedPeriod)
  }

  const {
    summary = {},
    categorySpending = [],
    topCategories = [],
    recentTransactions = []
  } = dashboardData || {};

  const translateCategory = (category) => {
    const translations = {
      'food': 'Comida',
      'transport': 'Transporte',
      'entertainment': 'Entretenimiento',
      'shopping': 'Compras',
      'healthcare': 'Salud',
      'utilities': 'Servicios',
      'education': 'Educación',
      'travel': 'Viajes',
      'investment': 'Inversiones',
      'income': 'Ingresos',
      'transfer': 'Transferencias',
      'other': 'Otros',
      'salary': 'Salario',
      'savings': 'Ahorros',
      'freelance': 'Freelance'
    }
    return translations[category?.toLowerCase()] || category || 'Otros'
  }

  const categoryData = Array.isArray(topCategories)
    ? topCategories
        .map((cat) => ({
          name: translateCategory(cat?.category),
          rawValue: cat?.amount,
          percentage: Number.isFinite(cat?.percentage) ? cat?.percentage : 0
        }))
        .filter((d) => typeof d.name === 'string' && Number.isFinite(d.rawValue))
        .map((d, index) => ({
          name: d.name,
          value: Math.max(0, Math.abs(Number(d.rawValue))),
          percentage: Math.max(0, Number(d.percentage)),
          color: COLORS[index % COLORS.length]
        }))
        .filter((d) => d.value > 0)
    : [];

  useEffect(() => {
    if (activeSlice >= categoryData.length) {
      setActiveSlice(-1)
    }
    setPieKey((k) => k + 1)
  }, [categoryData.length])

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingCard />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingCard />
          <LoadingCard />
        </div>
      </div>
    )
  }

  const safeActiveIndex = Number.isInteger(activeSlice) && activeSlice >= 0 && activeSlice < categoryData.length
    ? activeSlice
    : undefined

  const spendingTrend = Array.isArray(recentTransactions) && recentTransactions.length > 0
    ? recentTransactions.slice(0, 7).reverse().map((transaction, index) => ({
        day: `Día ${index + 1}`,
        amount: Math.abs(transaction?.amount || 0)
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
            Panel Financiero
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Resumen completo de tus finanzas personales
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col sm:items-end gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPeriod}
              className="btn-secondary p-2"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-brand-50 dark:bg-brand-900/30 text-sm font-medium text-brand-700 dark:text-brand-300">
              <Calendar className="w-4 h-4" />
              <span className="capitalize">{formattedSelectedPeriod}</span>
            </div>
            <button
              onClick={handleNextPeriod}
              className="btn-secondary p-2"
              aria-label="Mes siguiente"
              disabled={isCurrentPeriod}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleRefresh}
            className="btn-primary"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Spending */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card card-hover"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Gasto Total
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(summary?.totalSpending || 0)}
              </p>
              <div className="flex items-center mt-2">
                {summary?.spendingChangePercentage >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-red-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-emerald-500" />
                )}
                <span className={`text-sm ml-1 ${
                  summary?.spendingChangePercentage >= 0 ? 'text-red-500' : 'text-emerald-500'
                }`}>
                  {formatPercentage(summary?.spendingChangePercentage || 0)}
                </span>
              </div>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </motion.div>

        {/* Total Income */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card card-hover"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Ingresos Totales
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(summary?.totalIncome || 0)}
              </p>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-emerald-500 ml-1">
                  Este mes
                </span>
              </div>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </motion.div>

        {/* Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card card-hover"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Balance Actual
              </p>
              <p className={`text-2xl font-bold ${
                (summary?.balance || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {(summary?.balance || 0) >= 0 ? '' : '-'}{formatCurrency(Math.abs(summary?.balance || 0))}
              </p>
              <div className="flex items-center mt-2">
                <Target className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-500 ml-1">
                  Este mes
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-lg ${
              (summary?.balance || 0) >= 0
                ? 'bg-emerald-100 dark:bg-emerald-900/20'
                : 'bg-red-100 dark:bg-red-900/20'
            }`}>
              <CreditCard className={`w-6 h-6 ${
                (summary?.balance || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`} />
            </div>
          </div>
        </motion.div>

        {/* Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card card-hover"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Total de Transacciones
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {summary?.transactionCount || 0}
              </p>
              <div className="flex items-center mt-2">
                <Calendar className="w-4 h-4 text-brand-500" />
                <span className="text-sm text-brand-500 ml-1">
                  Este mes
                </span>
              </div>
            </div>
            <div className="p-3 bg-brand-100 dark:bg-brand-900/20 rounded-lg">
              <PieChartIcon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Spending Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          {categoryData.length > 0 ? (
            <Enhanced3DDonutChart
              data={categoryData}
              title="Gastos por Categoría"
            />
          ) : (
            <>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Gastos por Categoría
              </h3>
              <div className="flex items-center justify-center h-64 text-slate-500">
                No hay datos de categorías disponibles
              </div>
            </>
          )}
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Transacciones Recientes
          </h3>
          <div className="space-y-3">
            {Array.isArray(recentTransactions) && recentTransactions.length > 0 ? (
              recentTransactions.slice(0, 5).map((transaction, index) => (
                <motion.div
                  key={transaction._id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">
                      {transaction.description || transaction.merchant || 'Transacción'}
                    </p>
                    <div className="flex items-center space-x-3 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
                      <span>{new Date(transaction.date).toLocaleDateString()}</span>
                      {transaction.category && (
                        <span className="capitalize">{translateCategory(transaction.category)}</span>
                      )}
                    </div>
                  </div>
                  <div className="sm:text-right whitespace-nowrap sm:self-center self-end">
                    <p className={`font-semibold ${
                      transaction.type === 'credit' || transaction.type === 'deposit'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {
                        formatCurrency(
                          (transaction.type === 'credit' || transaction.type === 'deposit')
                            ? Math.abs(transaction.amount)
                            : -Math.abs(transaction.amount),
                          true
                        )
                      }
                    </p>
                    {transaction.category && (
                      <p className="text-xs text-slate-500 capitalize">
                        {translateCategory(transaction.category)}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center text-slate-500 py-8">
                No hay transacciones recientes
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Spending Trend */}
      {spendingTrend.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Tendencia de Gastos (Últimos 7 días)
          </h3>
          <ChartErrorBoundary>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={spendingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.3} />
                <XAxis dataKey="day" />
                <YAxis formatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value) => [formatCurrency(value), 'Gasto']} />
                <Line
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="amount"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartErrorBoundary>
        </motion.div>
      )}

      {/* Email Sync Control */}
      <EmailSyncControl />
    </div>
  )
}

export default Dashboard;
