import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  Activity,
  Calendar,
  Target,
  Store,
  PieChart as PieChartIcon, // Renombrar para evitar conflicto
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightIcon
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
  Legend,
  LineChart,
  Line,
  Sector
} from 'recharts';
import useAppStore from '../stores/appStore';
import { getDashboardData } from '../services/api'; // Importar directamente
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import LoadingCard from '../components/common/LoadingCard';
import EmailSyncControl from '../components/dashboard/EmailSyncControl';
import PdfUpload from '../components/dashboard/PdfUpload';
import HistoryInsights from '../components/dashboard/HistoryInsights';
import { PageHeader, StatCard, SectionCard, ListRow, IconBadge, Chip, EmptyState } from '../components/ui/kit';
import { formatCurrency, formatCurrencyAuto, formatCurrencyUltraCompact, formatNumber, formatPercentage } from '../utils/formatters';

// Import Enhanced Charts
import {
  Enhanced3DDonutChart,
  EnhancedBarChart,
  IncomeExpenseAreaChart,
  FinancialHealthRadar,
  MonthOverMonthComparison
} from '../components/dashboard/EnhancedCharts';

// Paleta oficial centralizada (misma fuente que tailwind.config.js — DOC/GUIA_DE_ESTILO.md)
const COLORS = ['#3F7079', '#A6C0B4', '#A79E82', '#D4CBB0', '#63929B', '#658876'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card p-2 rounded-lg border border-subtle shadow-lg">
        <p className="text-sm font-medium text-main">{`${payload[0].name}: ${formatCurrency(payload[0].value)}`}</p>
        <p className="text-xs text-muted">{`Porcentaje: ${payload[0].payload.percentage.toFixed(1)}%`}</p>
      </div>
    );
  }

  return null;
};

class ChartErrorBoundary extends React.Component<{ children?: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Chart render error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return <div className="text-sm text-muted">No se pudo renderizar el gráfico.</div>
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
  // "Todo": historial completo, sin filtro de mes
  const [allTime, setAllTime] = useState(false);

  const loadDashboardData = useCallback(async (period, all = false) => {
    if (!period && !all) return;
    try {
      setLoading(true);
      const data = await getDashboardData(all ? { range: 'all' } : { month: period.month, year: period.year });
      setDashboardData(data);

      if (!all && data?.period?.month && data?.period?.year) {
        const normalized = {
          month: data.period.month,
          year: data.period.year,
        };
        if (normalized.month !== period.month || normalized.year !== period.year) {
          setSelectedPeriod(normalized);
        }
      }
    } catch (error) {
      console.error('❌ Dashboard loading error:', error);
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
    loadDashboardData(selectedPeriod, allTime);
  }, [selectedPeriod, allTime, loadDashboardData]);

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
    if (allTime) { setAllTime(false); return }
    setSelectedPeriod((prev) => {
      const month = prev.month === 1 ? 12 : prev.month - 1
      const year = prev.month === 1 ? prev.year - 1 : prev.year
      return { month, year }
    })
  }

  const handleNextPeriod = () => {
    if (allTime) { setAllTime(false); return }
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
    loadDashboardData(selectedPeriod, allTime)
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

  // Reset active slice if data size changes or index is out of range
  useEffect(() => {
    if (activeSlice >= categoryData.length) {
      setActiveSlice(-1)
    }
    // Force remount when slice count changes to avoid internal state inconsistencies
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

  const balancePositive = (summary?.balance || 0) >= 0
  const spendingUp = (summary?.spendingChangePercentage ?? 0) >= 0

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* PageHeader con selector de mes + acción */}
      <PageHeader
        title="Panel Financiero"
        subtitle="Resumen completo e inteligente de tus finanzas personales en Kipu"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-base/60 p-1 rounded-xl border border-subtle">
              <button onClick={handlePrevPeriod} aria-label="Mes anterior" className="p-1.5 rounded-lg text-muted hover:text-main hover:bg-card transition-all cursor-pointer">
                <ChevronLeft size={16} />
              </button>
              <span className="flex items-center gap-1.5 px-2 text-xs font-bold text-main capitalize">
                <Calendar size={13} className="text-brand-primary" />
                {allTime ? 'Todo el historial' : formattedSelectedPeriod}
              </span>
              <button onClick={handleNextPeriod} disabled={!allTime && isCurrentPeriod} aria-label="Mes siguiente" className="p-1.5 rounded-lg text-muted hover:text-main hover:bg-card transition-all disabled:opacity-40 cursor-pointer">
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setAllTime((v) => !v)}
                aria-pressed={allTime}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  allTime
                    ? 'bg-brand-primary text-white dark:text-brand-dark shadow'
                    : 'text-muted hover:text-main hover:bg-card'
                }`}
              >
                Todo
              </button>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 bg-brand-primary hover:opacity-90 text-white dark:text-brand-dark px-5 py-2.5 rounded-full font-bold text-xs tracking-wide uppercase shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              Actualizar
            </button>
          </div>
        }
      />

      {/* Indicador de movimientos sin clasificar */}
      {(summary?.unclassifiedCount ?? 0) > 0 && (
        <Link
          to="/transactions?category=unclassified"
          className="flex items-center gap-3 p-4 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-all"
        >
          <IconBadge icon={AlertTriangle} accent="amber" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-main">
              {summary.unclassifiedCount} movimiento{summary.unclassifiedCount === 1 ? '' : 's'} sin clasificar
            </p>
            <p className="text-xs text-muted">Clasifícalos una vez y crea reglas para automatizar los futuros.</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 whitespace-nowrap">Resolver →</span>
        </Link>
      )}

      {/* Fila de KPIs (StatCard con glow) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Gasto Total"
          value={formatCurrency(summary?.totalSpending || 0)}
          icon={TrendingDown}
          accent="rose"
          caption={allTime ? 'TODO EL HISTORIAL' : `${formatPercentage(summary?.spendingChangePercentage || 0)} vs mes anterior`}
          captionIcon={allTime ? undefined : (spendingUp ? ArrowUpRight : ArrowDownLeft)}
          captionAccent="rose"
        />
        <StatCard
          label="Ingresos Totales"
          value={formatCurrency(summary?.totalIncome || 0)}
          icon={TrendingUp}
          accent="emerald"
          caption={allTime ? 'TODO EL HISTORIAL' : 'ESTE MES'}
          captionIcon={ArrowUpRight}
          captionAccent="emerald"
        />
        <StatCard
          label="Balance Actual"
          value={`${balancePositive ? '' : '-'}${formatCurrency(Math.abs(summary?.balance || 0))}`}
          icon={CreditCard}
          accent={balancePositive ? 'primary' : 'rose'}
          caption={balancePositive ? 'BALANCE POSITIVO' : 'BALANCE NEGATIVO'}
          captionIcon={Activity}
          captionAccent={balancePositive ? 'primary' : 'rose'}
        />
        <StatCard
          label="Transacciones"
          value={summary?.transactionCount || 0}
          icon={Calendar}
          accent="primary"
          caption={allTime ? 'TODO EL HISTORIAL' : 'DEL PERIODO'}
        />
      </div>

      {/* Grid principal 12 cols: dona (5) + recientes (7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <SectionCard title="Gastos por Categoría" className="lg:col-span-5">
          {categoryData.length > 0 ? (
            <Enhanced3DDonutChart data={categoryData} title="" />
          ) : (
            <div className="flex items-center justify-center h-64 text-sm text-muted">
              No hay datos de categorías disponibles
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Transacciones Recientes"
          className="lg:col-span-7"
          action={
            <Link to="/transactions" className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-main transition-colors cursor-pointer underline">
              <span>Ver todas</span>
              <ChevronRightIcon size={14} />
            </Link>
          }
        >
          {Array.isArray(recentTransactions) && recentTransactions.length > 0 ? (
            <div className="divide-y divide-subtle">
              {recentTransactions.slice(0, 5).map((transaction, index) => {
                const isIncome = transaction.type === 'credit' || transaction.type === 'deposit'
                return (
                  <ListRow key={transaction._id || index}>
                    <div className="flex items-center gap-3 min-w-0">
                      <IconBadge icon={isIncome ? ArrowUpRight : ArrowDownLeft} accent={isIncome ? 'emerald' : 'rose'} size={16} className="rounded-xl" />
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-main truncate">{transaction.description || transaction.merchant || 'Transacción'}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted font-mono">{new Date(transaction.date).toLocaleDateString()}</span>
                          {transaction.category && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-brand-primary/20" />
                              <Chip>{translateCategory(transaction.category)}</Chip>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`text-sm font-bold font-display whitespace-nowrap ${isIncome ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {formatCurrency(isIncome ? Math.abs(transaction.amount) : -Math.abs(transaction.amount), true)}
                    </span>
                  </ListRow>
                )
              })}
            </div>
          ) : (
            <EmptyState icon={CreditCard} title="Sin transacciones" message="No hay movimientos recientes en este periodo." />
          )}
        </SectionCard>
      </div>

      {/* Tendencia de gastos */}
      {spendingTrend.length > 0 && (
        <SectionCard title="Tendencia de Gastos (últimos 7 días)">
          <ChartErrorBoundary>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={spendingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="day" />
                <YAxis {...({ formatter: (value: any) => formatCurrency(value) } as any)} />
                <Tooltip formatter={(value: any) => [formatCurrency(value), 'Gasto']} />
                <Line isAnimationActive={false} type="monotone" dataKey="amount" stroke="#3F7079" strokeWidth={3} dot={{ fill: '#3F7079', strokeWidth: 2, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartErrorBoundary>
        </SectionCard>
      )}

      {/* Top comercios */}
      {Array.isArray(dashboardData?.topMerchants) && dashboardData.topMerchants.length > 0 && (
        <SectionCard title={allTime ? 'Top comercios de todo el historial' : 'Top comercios del periodo'}>
          <div className="divide-y divide-subtle">
            {dashboardData.topMerchants.map((m, i) => (
              <ListRow key={i}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="h-8 w-8 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/15 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="text-sm font-semibold text-main truncate">{m.name}</span>
                </div>
                <span className="text-sm font-bold font-display tabular-nums text-main whitespace-nowrap">{formatCurrency(m.amount)}</span>
              </ListRow>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Historial completo y comportamiento financiero (vista "Todo") */}
      {allTime && <HistoryInsights />}

      {/* Importar PDF + sincronización de correos */}
      <PdfUpload onImported={() => loadDashboardData(selectedPeriod, allTime)} />
      <EmailSyncControl />
    </motion.div>
  )
}

export default Dashboard;
