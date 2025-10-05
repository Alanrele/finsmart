import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Target,
  PieChart
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line
} from 'recharts'
import useAppStore from '../stores/appStore'
import { financeAPI, handleApiError } from '../services/api'
import toast from 'react-hot-toast'
import LoadingCard from './LoadingCard'

const Dashboard = () => {
  const { dashboardData, setDashboardData } = useAppStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const response = await financeAPI.getDashboard()
      setDashboardData(response.data)
    } catch (error) {
      const errorInfo = handleApiError(error)
      toast.error(errorInfo.message)
    } finally {
      setLoading(false)
    }
  }

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

  const { summary, categorySpending, topCategories, recentTransactions } = dashboardData || {}

  // Chart colors
  const COLORS = ['#C6A664', '#D4AF37', '#B8951A', '#A0860F', '#8B7509']

  // Prepare data for charts
  const categoryData = topCategories?.map((cat, index) => ({
    name: cat.category,
    value: cat.amount,
    color: COLORS[index % COLORS.length]
  })) || []

  const spendingTrend = recentTransactions?.slice(0, 7).reverse().map((transaction, index) => ({
    day: `Día ${index + 1}`,
    amount: transaction.amount
  })) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard Financiero
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Resumen de tus finanzas personales
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
                S/ {summary?.totalSpending?.toLocaleString() || '0'}
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
                  {Math.abs(summary?.spendingChangePercentage || 0).toFixed(1)}%
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
                Ingresos
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                S/ {summary?.totalIncome?.toLocaleString() || '0'}
              </p>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-500 ml-1">
                  Mes actual
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
                Balance
              </p>
              <p className={`text-2xl font-bold ${
                (summary?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                S/ {summary?.balance?.toLocaleString() || '0'}
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
                Transacciones
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
              <PieChart className="w-6 h-6 text-blue-600" />
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
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `S/ ${value.toLocaleString()}`} />
              </RechartsPieChart>
            </ResponsiveContainer>
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
            {recentTransactions?.slice(0, 5).map((transaction, index) => (
              <motion.div
                key={transaction._id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {transaction.description || transaction.merchant || 'Transacción'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(transaction.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    transaction.type === 'credit' || transaction.type === 'deposit'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {transaction.type === 'credit' || transaction.type === 'deposit' ? '+' : '-'}
                    S/ {transaction.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {transaction.category}
                  </p>
                </div>
              </motion.div>
            )) || (
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
              <YAxis formatter={(value) => `S/ ${value}`} />
              <Tooltip formatter={(value) => [`S/ ${value.toLocaleString()}`, 'Gasto']} />
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
    </div>
  )
}

export default Dashboard
