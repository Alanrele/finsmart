import React, { useEffect, useState, useCallback } from 'react';
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
  PieChart as PieChartIcon // Renombrar para evitar conflicto
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart, // Este es el componente de Recharts
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Sector
} from 'recharts';
import useAppStore from '../stores/appStore';
import { getDashboardData } from '../services/api'; // Importar directamente
import toast from 'react-hot-toast';
import LoadingCard from './LoadingCard';
import EmailSyncControl from './EmailSyncControl';
import { formatCurrency, formatCurrencyAuto, formatCurrencyUltraCompact, formatNumber, formatPercentage } from '../utils/formatters';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 rounded shadow-lg">
        <p className="text-sm font-medium text-gray-900">{`${payload[0].name}: ${formatCurrency(payload[0].value)}`}</p>
        <p className="text-xs text-gray-500">{`Porcentaje: ${payload[0].payload.percentage.toFixed(1)}%`}</p>
      </div>
    );
  }

  return null;
};

class PieErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    console.error('Pie chart render error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return <div className="text-sm text-gray-500 dark:text-gray-400">No se pudo renderizar el gráfico.</div>
    }
    return this.props.children
  }
}

const Dashboard = () => {
  const { dashboardData, setDashboardData } = useAppStore();
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error('❌ Dashboard loading error:', error);
      toast.error(error.message || 'Error al cargar los datos del panel.');
      // Establecer datos vacíos por defecto para evitar errores de renderizado
      setDashboardData({
        summary: {},
        categorySpending: [],
        topCategories: [],
        recentTransactions: [],
      });
    } finally {
      setLoading(false);
    }
  }, [setDashboardData]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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

  const [activeSlice, setActiveSlice] = useState(-1)

  const categoryData = Array.isArray(topCategories)
    ? topCategories
        .filter((cat) => (cat?.amount || 0) > 0)
        .map((cat, index) => ({
          name: translateCategory(cat?.category),
          value: Math.abs(cat?.amount || 0),
          percentage: cat?.percentage || 0,
          color: COLORS[index % COLORS.length]
        }))
    : [];

  // Reset active slice if data size changes or index is out of range
  useEffect(() => {
    if (activeSlice >= categoryData.length) {
      setActiveSlice(-1)
    }
  }, [categoryData.length])

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
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            Panel Financiero
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Resumen completo de tus finanzas personales
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={loadDashboardData}
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
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Gasto Total
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(summary?.totalSpending || 0)}
              </p>
              <div className="flex items-center mt-2">
                {summary?.spendingChangePercentage >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-red-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-green-500" />
                )}
                <span className={`text-sm ml-1 ${
                  summary?.spendingChangePercentage >= 0 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {formatPercentage(summary?.spendingChangePercentage || 0)}
                </span>
              </div>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
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
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Ingresos Totales
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(summary?.totalIncome || 0)}
              </p>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-500 ml-1">
                  Este mes
                </span>
              </div>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
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
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Balance Actual
              </p>
              <p className={`text-2xl font-bold ${
                (summary?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(summary?.balance || 0) >= 0 ? '' : '-'}{formatCurrency(Math.abs(summary?.balance || 0))}
              </p>
              <div className="flex items-center mt-2">
                <Target className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500 ml-1">
                  Este mes
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-lg ${
              (summary?.balance || 0) >= 0
                ? 'bg-green-100 dark:bg-green-900/20'
                : 'bg-red-100 dark:bg-red-900/20'
            }`}>
              <CreditCard className={`w-6 h-6 ${
                (summary?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
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
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total de Transacciones
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary?.transactionCount || 0}
              </p>
              <div className="flex items-center mt-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-500 ml-1">
                  Este mes
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <PieChartIcon className="w-6 h-6 text-blue-600" />
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Gastos por Categoría
          </h3>
          {categoryData.length > 0 ? (
            <PieErrorBoundary>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                {/* Effects */}
                <defs>
                  <filter id="dropShadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                    <feOffset dx="1" dy="2" result="offsetblur" />
                    <feComponentTransfer>
                      <feFuncA type="linear" slope="0.3" />
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  dataKey="value"
                  minAngle={4}
                  labelLine={false}
                  isAnimationActive={false}
                  label={({ name, percentage }) => `${name} ${Number(percentage || 0).toFixed(1)}%`}
                  onMouseEnter={(_, index) => setActiveSlice(index)}
                  onMouseLeave={() => setActiveSlice(-1)}
                  onClick={(_, index) => setActiveSlice(prev => (prev === index ? -1 : index))}
                  onTouchStart={(_, index) => setActiveSlice(index)}
                  activeIndex={safeActiveIndex}
                  activeShape={safeActiveIndex !== undefined ? ((props) => {
                    const depth = 8
                    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props || {}
                    if ([cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill].some(v => v == null)) {
                      return null
                    }
                    return (
                      <g>
                        <g transform={`translate(0, ${depth})`}>
                          <Sector
                            cx={cx}
                            cy={cy}
                            innerRadius={innerRadius}
                            outerRadius={outerRadius}
                            startAngle={startAngle}
                            endAngle={endAngle}
                            fill={fill}
                            opacity={0.35}
                          />
                        </g>
                        <Sector
                          cx={cx}
                          cy={cy}
                          innerRadius={innerRadius}
                          outerRadius={outerRadius + 6}
                          startAngle={startAngle}
                          endAngle={endAngle}
                          fill={fill}
                          filter="url(#dropShadow)"
                          stroke="#ffffff"
                          strokeWidth={1}
                        />
                      </g>
                    )
                  }) : undefined}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} cursor="pointer" />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            </PieErrorBoundary>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No hay datos de categorías disponibles
            </div>
          )}
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
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
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {transaction.description || transaction.merchant || 'Transacción'}
                    </p>
                    <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                      <span>{new Date(transaction.date).toLocaleDateString()}</span>
                      {transaction.category && (
                        <span className="capitalize">{translateCategory(transaction.category)}</span>
                      )}
                    </div>
                  </div>
                  <div className="sm:text-right whitespace-nowrap sm:self-center self-end">
                    <p className={`font-semibold ${
                      transaction.type === 'credit' || transaction.type === 'deposit'
                        ? 'text-green-600'
                        : 'text-red-600'
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
                      <p className="text-xs text-gray-500 capitalize">
                        {translateCategory(transaction.category)}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Tendencia de Gastos (Últimos 7 días)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={spendingTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis formatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value) => [formatCurrency(value), 'Gasto']} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#C6A664"
                strokeWidth={3}
                dot={{ fill: '#C6A664', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Email Sync Control */}
      <EmailSyncControl />
    </div>
  )
}

export default Dashboard;
