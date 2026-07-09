import React, { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  Trophy,
  CalendarRange,
  Flame,
  PiggyBank,
  Store,
  Repeat,
  Clock,
  Wallet,
  Percent,
  Receipt,
} from 'lucide-react'
import { getFinancialHistory } from '../../services/api'
import { SectionCard, StatCard, ListRow, IconBadge, Chip, EmptyState } from '../ui/kit'
import { formatCurrency, formatCurrencyAuto } from '../../utils/formatters'
import LoadingCard from '../common/LoadingCard'

/*
  Historial financiero completo y comportamiento (todo el tiempo).
  Se muestra en el panel cuando el usuario elige el periodo "Todo":
  promedios, evolución mensual ingresos vs gastos, récords y hábitos
  (gastos recurrentes, día de mayor gasto, comercio más frecuente).
*/

const CATEGORY_LABELS = {
  food: 'Comida', transport: 'Transporte', entertainment: 'Entretenimiento',
  shopping: 'Compras', healthcare: 'Salud', utilities: 'Servicios',
  education: 'Educación', travel: 'Viajes', investment: 'Inversiones',
  income: 'Ingresos', transfer: 'Transferencias', other: 'Otros',
  unclassified: 'Sin clasificar', salary: 'Salario', savings: 'Ahorros',
  freelance: 'Freelance',
}
const translateCategory = (c) => CATEGORY_LABELS[(c || '').toLowerCase()] || c || 'Otros'

const formatLongDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const s = d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
  return s
}

const HistoryTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-card border border-subtle rounded-2xl p-3 shadow-xl">
      <p className="micro-label mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-xs font-semibold text-main">
          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: p.color }} />
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

/* Fila de hábito/insight: icono + título + detalle + valor a la derecha */
const InsightRow = ({ icon, accent, title, detail, value }) => (
  <ListRow>
    <div className="flex items-center gap-3 min-w-0">
      <IconBadge icon={icon} accent={accent} size={16} className="rounded-xl" />
      <div className="min-w-0">
        <h4 className="text-sm font-semibold text-main truncate">{title}</h4>
        {detail && <p className="text-xs text-muted mt-0.5 truncate">{detail}</p>}
      </div>
    </div>
    {value && (
      <span className="text-sm font-bold font-display tabular-nums text-main whitespace-nowrap">{value}</span>
    )}
  </ListRow>
)

const HistoryInsights = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const resp = await getFinancialHistory()
        if (!cancelled) setData(resp)
      } catch (e) {
        console.error('Error loading financial history:', e)
        if (!cancelled) setError(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingCard />
        <LoadingCard />
      </div>
    )
  }

  if (error) {
    return (
      <SectionCard title="Historial y comportamiento">
        <EmptyState icon={CalendarRange} title="No se pudo cargar" message="Vuelve a intentarlo en unos segundos." />
      </SectionCard>
    )
  }

  if (!data || data.empty) {
    return (
      <SectionCard title="Historial y comportamiento">
        <EmptyState
          icon={CalendarRange}
          title="Aún no hay historial"
          message="Importa tus estados de cuenta o sincroniza tu correo para construir tu historial financiero."
        />
      </SectionCard>
    )
  }

  const { range, totals, averages, monthly, behavior, topCategories } = data
  const savingsPositive = (averages?.savingsRate ?? 0) >= 0

  return (
    <div className="space-y-6">
      {/* Promedios de comportamiento (todo el tiempo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Gasto promedio mensual"
          value={formatCurrencyAuto(averages?.monthlySpending || 0)}
          icon={Wallet}
          accent="rose"
          caption={`EN ${range?.monthsActive || 0} MES${(range?.monthsActive || 0) === 1 ? '' : 'ES'}`}
        />
        <StatCard
          label="Ingreso promedio mensual"
          value={formatCurrencyAuto(averages?.monthlyIncome || 0)}
          icon={PiggyBank}
          accent="emerald"
          caption="TODO EL TIEMPO"
        />
        <StatCard
          label="Tasa de ahorro"
          value={averages?.savingsRate == null ? '—' : `${averages.savingsRate.toFixed(1)}%`}
          icon={Percent}
          accent={savingsPositive ? 'primary' : 'rose'}
          caption={savingsPositive ? 'DE TUS INGRESOS' : 'GASTAS MÁS DE LO QUE INGRESA'}
        />
        <StatCard
          label="Ticket promedio de gasto"
          value={formatCurrencyAuto(averages?.expenseTicket || 0)}
          icon={Receipt}
          accent="primary"
          caption={`${totals?.expenseCount || 0} GASTOS REGISTRADOS`}
        />
      </div>

      {/* Evolución mensual: ingresos vs gastos + balance neto */}
      <SectionCard
        title="Evolución mensual de todo tu historial"
        action={
          range?.from && (
            <Chip>{`Desde ${formatLongDate(range.from)}`}</Chip>
          )
        }
      >
        {monthly && monthly.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={monthly} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
              <YAxis tickFormatter={(v) => formatCurrencyAuto(v)} tick={{ fontSize: 11 }} stroke="var(--text-muted)" width={80} />
              <Tooltip content={<HistoryTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" name="Ingresos" fill="#A6C0B4" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="spending" name="Gastos" fill="#3F7079" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              <Line type="monotone" dataKey="net" name="Balance neto" stroke="#A79E82" strokeWidth={2} dot={{ r: 3, fill: '#A79E82' }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={CalendarRange} title="Sin datos mensuales" message="Aún no hay meses con movimientos." />
        )}
      </SectionCard>

      {/* Comportamiento y hábitos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Tu comportamiento financiero">
          <div className="divide-y divide-subtle">
            {behavior?.biggestExpense && (
              <InsightRow
                icon={Flame}
                accent="rose"
                title="Tu mayor gasto de todos los tiempos"
                detail={`${behavior.biggestExpense.description} · ${formatLongDate(behavior.biggestExpense.date)}`}
                value={formatCurrency(behavior.biggestExpense.amount)}
              />
            )}
            {behavior?.maxSpendingMonth && (
              <InsightRow
                icon={CalendarRange}
                accent="amber"
                title="El mes en que más gastaste"
                detail={behavior.maxSpendingMonth.label}
                value={formatCurrency(behavior.maxSpendingMonth.spending)}
              />
            )}
            {behavior?.bestNetMonth && (
              <InsightRow
                icon={Trophy}
                accent="emerald"
                title="Tu mejor mes de ahorro"
                detail={behavior.bestNetMonth.label}
                value={formatCurrency(behavior.bestNetMonth.net)}
              />
            )}
            {behavior?.topWeekday && (
              <InsightRow
                icon={Clock}
                accent="primary"
                title="El día que más gastas"
                detail={`Los ${behavior.topWeekday.day.toLowerCase()} acumulan tu mayor gasto`}
                value={formatCurrency(behavior.topWeekday.amount)}
              />
            )}
            {behavior?.frequentMerchant && (
              <InsightRow
                icon={Store}
                accent="primary"
                title="Tu comercio más frecuente"
                detail={`${behavior.frequentMerchant.name} · ${behavior.frequentMerchant.count} veces`}
                value={formatCurrency(behavior.frequentMerchant.amount)}
              />
            )}
          </div>
        </SectionCard>

        <SectionCard title="Gastos recurrentes detectados">
          {behavior?.recurring && behavior.recurring.length > 0 ? (
            <div className="divide-y divide-subtle">
              {behavior.recurring.map((r) => (
                <InsightRow
                  key={r.name}
                  icon={Repeat}
                  accent="primary"
                  title={r.name}
                  detail={`Presente en ${r.monthsSeen} meses · ${r.count} pagos · promedio ${formatCurrency(r.avgAmount)}`}
                  value={formatCurrency(r.total)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Repeat}
              title="Sin recurrentes aún"
              message="Cuando un mismo comercio aparezca en 3 o más meses, lo verás aquí como posible suscripción o hábito."
            />
          )}
        </SectionCard>
      </div>

      {/* Categorías de todo el historial */}
      {topCategories && topCategories.length > 0 && (
        <SectionCard title="En qué se ha ido tu dinero (todo el historial)">
          <div className="space-y-4">
            {topCategories.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-sm font-semibold text-main">{translateCategory(cat.category)}</span>
                  <span className="text-xs text-muted font-mono">
                    {formatCurrency(cat.amount)} · {cat.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-black/[0.04] dark:bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-primary/70"
                    style={{ width: `${Math.min(100, Math.max(2, cat.percentage))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

export default HistoryInsights
