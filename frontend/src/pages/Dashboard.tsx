import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  Calendar,
  Target,
  Gauge,
  Scale,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line
} from 'recharts';
import useAppStore from '../stores/appStore';
import useAuthStore from '../stores/authStore';
import { getDashboardData } from '../services/api';
import { Link } from 'react-router-dom';
import LoadingCard from '../components/common/LoadingCard';
import EmailSyncControl from '../components/dashboard/EmailSyncControl';
import PdfUpload from '../components/dashboard/PdfUpload';
import HistoryInsights from '../components/dashboard/HistoryInsights';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import { PageHeader, StatCard, SectionCard, ListRow, IconBadge, Chip, EmptyState } from '../components/ui/kit';
import { formatCurrency, formatCurrencyAuto, formatPercentage } from '../utils/formatters';
import { Enhanced3DDonutChart } from '../components/dashboard/EnhancedCharts';

/* Animaciones compartidas: entrada escalonada con resorte suave */
const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
} as const;
const fadeUpItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 24, stiffness: 240 } },
} as const;
const sectionReveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { type: 'spring', damping: 26, stiffness: 220 },
} as const;

// Paleta oficial centralizada (misma fuente que tailwind.config.js — DOC/GUIA_DE_ESTILO.md)
const COLORS = ['#3F7079', '#A6C0B4', '#A79E82', '#D4CBB0', '#63929B', '#658876'];

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
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
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
      setLoadError(false);
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
      setLoadError(true);
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
      'yape': 'Yape',
      'transfer': 'Transferencias',
      'other': 'Otros',
      'unclassified': 'Sin clasificar',
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

  // Suma por día real (antes: una transacción por punto etiquetada "Día N")
  const spendingTrend = (() => {
    if (!Array.isArray(recentTransactions) || recentTransactions.length === 0) return []
    const byDay: Record<string, number> = {}
    for (const t of recentTransactions) {
      const d = new Date(t?.date)
      if (Number.isNaN(d.getTime())) continue
      byDay[d.toISOString().slice(0, 10)] = (byDay[d.toISOString().slice(0, 10)] || 0) + Math.abs(t?.amount || 0)
    }
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([key, amount]) => ({
        day: new Date(`${key}T12:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }),
        amount: Math.round(amount * 100) / 100,
      }))
  })();

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
        title={user?.firstName ? `Hola, ${user.firstName}` : 'Panel Financiero'}
        subtitle="Este es el estado de tus finanzas, nudo por nudo"
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

      {/* Error de carga: aviso claro con reintento (nunca un panel vacío mudo) */}
      {loadError && (
        <div className="flex items-center gap-3 p-4 rounded-[2rem] bg-rose-500/10 border border-rose-500/20">
          <IconBadge icon={AlertTriangle} accent="rose" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-main">No se pudo cargar tu panel</p>
            <p className="text-xs text-muted">Revisa tu conexión con el servidor y vuelve a intentarlo.</p>
          </div>
          <button onClick={handleRefresh} className="btn-secondary !py-2.5 whitespace-nowrap">Reintentar</button>
        </div>
      )}

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

      {/* Fila de KPIs: números animados y entrada escalonada */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={fadeUpItem}>
          <StatCard
            label="Gasto Total"
            value={<AnimatedNumber value={summary?.totalSpending || 0} format={(n) => formatCurrency(n)} />}
            icon={TrendingDown}
            accent="rose"
            caption={allTime ? 'TODO EL HISTORIAL' : `${formatPercentage(summary?.spendingChangePercentage || 0)} vs mes anterior`}
            captionIcon={allTime ? undefined : (spendingUp ? ArrowUpRight : ArrowDownLeft)}
            captionAccent="rose"
          />
        </motion.div>
        <motion.div variants={fadeUpItem}>
          <StatCard
            label="Ingresos Totales"
            value={<AnimatedNumber value={summary?.totalIncome || 0} format={(n) => formatCurrency(n)} />}
            icon={TrendingUp}
            accent="emerald"
            caption={allTime ? 'TODO EL HISTORIAL' : 'ESTE MES'}
            captionIcon={ArrowUpRight}
            captionAccent="emerald"
          />
        </motion.div>
        <motion.div variants={fadeUpItem}>
          <StatCard
            label="Balance Actual"
            value={
              <>
                {balancePositive ? '' : '-'}
                <AnimatedNumber value={Math.abs(summary?.balance || 0)} format={(n) => formatCurrency(n)} />
              </>
            }
            icon={CreditCard}
            accent={balancePositive ? 'primary' : 'rose'}
            caption={balancePositive ? 'BALANCE POSITIVO' : 'BALANCE NEGATIVO'}
            captionIcon={Activity}
            captionAccent={balancePositive ? 'primary' : 'rose'}
          />
        </motion.div>
        <motion.div variants={fadeUpItem}>
          <StatCard
            label="Transacciones"
            value={<AnimatedNumber value={summary?.transactionCount || 0} format={(n) => String(Math.round(n))} />}
            icon={Calendar}
            accent="primary"
            caption={allTime ? 'TODO EL HISTORIAL' : 'DEL PERIODO'}
          />
        </motion.div>
      </motion.div>

      {/* Pulso del mes: ritmo diario, proyección de cierre y comparación (solo vista mensual) */}
      {!allTime && ((summary?.totalSpending || 0) > 0 || (summary?.previousMonthSpending || 0) > 0) && (() => {
        const daysInMonth = new Date(selectedPeriod.year, selectedPeriod.month, 0).getDate()
        const daysElapsed = isCurrentPeriod ? Math.max(1, new Date().getDate()) : daysInMonth
        const dailyAvg = (summary?.totalSpending || 0) / daysElapsed
        const projection = dailyAvg * daysInMonth
        const prev = summary?.previousMonthSpending
        const diff = prev != null ? (summary?.totalSpending || 0) - prev : null
        return (
          <motion.div {...sectionReveal}>
            <SectionCard title="Pulso del mes">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-base/60 border border-subtle">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Gauge className="w-4 h-4 text-primary dark:text-primary-300" />
                    <p className="micro-label">Ritmo de gasto</p>
                  </div>
                  <p className="font-display text-xl font-bold tabular-nums text-main">
                    <AnimatedNumber value={dailyAvg} format={(n) => formatCurrencyAuto(n)} />
                  </p>
                  <p className="text-xs text-muted mt-0.5">promedio por día{isCurrentPeriod ? ` (${daysElapsed} días)` : ''}</p>
                </div>
                {isCurrentPeriod && (
                  <div className="p-4 rounded-2xl bg-base/60 border border-subtle">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Target className="w-4 h-4 text-amber-500" />
                      <p className="micro-label">Proyección de cierre</p>
                    </div>
                    <p className="font-display text-xl font-bold tabular-nums text-main">
                      <AnimatedNumber value={projection} format={(n) => formatCurrencyAuto(n)} />
                    </p>
                    <p className="text-xs text-muted mt-0.5">si mantienes este ritmo hasta fin de mes</p>
                  </div>
                )}
                {prev != null && (
                  <div className="p-4 rounded-2xl bg-base/60 border border-subtle">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Scale className="w-4 h-4 text-sage-600 dark:text-sage-300" />
                      <p className="micro-label">Mes anterior</p>
                    </div>
                    <p className="font-display text-xl font-bold tabular-nums text-main">
                      <AnimatedNumber value={prev} format={(n) => formatCurrencyAuto(n)} />
                    </p>
                    <p className={`text-xs mt-0.5 font-semibold ${diff != null && diff > 0 ? 'text-rose-500' : 'text-sage-600 dark:text-sage-300'}`}>
                      {diff == null || prev === 0
                        ? 'sin datos comparables'
                        : diff > 0
                          ? `estás gastando ${formatCurrencyAuto(Math.abs(diff))} más`
                          : diff < 0
                            ? `vas ${formatCurrencyAuto(Math.abs(diff))} por debajo`
                            : 'mismo nivel de gasto'}
                    </p>
                  </div>
                )}
              </div>
            </SectionCard>
          </motion.div>
        )
      })()}

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
        <motion.div {...sectionReveal}>
          <SectionCard title={`Tendencia de Gastos (últimos ${spendingTrend.length} día${spendingTrend.length === 1 ? '' : 's'} con movimientos)`}>
            <ChartErrorBoundary>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={spendingTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
                  {/* Bug corregido: YAxis usaba una prop "formatter" inexistente */}
                  <YAxis tickFormatter={(v) => formatCurrencyAuto(v)} tick={{ fontSize: 11 }} stroke="var(--text-muted)" width={78} />
                  <Tooltip formatter={(value: any) => [formatCurrency(value), 'Gasto']} />
                  <Line isAnimationActive={false} type="monotone" dataKey="amount" stroke="#3F7079" strokeWidth={3} dot={{ fill: '#3F7079', strokeWidth: 2, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartErrorBoundary>
          </SectionCard>
        </motion.div>
      )}

      {/* Top comercios */}
      {Array.isArray(dashboardData?.topMerchants) && dashboardData.topMerchants.length > 0 && (
        <motion.div {...sectionReveal}>
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
        </motion.div>
      )}

      {/* Historial completo y comportamiento financiero (vista "Todo") */}
      {allTime && <HistoryInsights />}

      {/* Importar PDF + sincronización de correos */}
      <motion.div {...sectionReveal}>
        <PdfUpload onImported={() => loadDashboardData(selectedPeriod, allTime)} />
      </motion.div>
      <motion.div {...sectionReveal}>
        <EmailSyncControl />
      </motion.div>
    </motion.div>
  )
}

export default Dashboard;
