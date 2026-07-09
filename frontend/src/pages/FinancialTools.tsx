import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy,
  Calculator,
  PiggyBank,
  DollarSign,
  TrendingUp,
  Layers,
  Search,
  Lock,
  ArrowLeft,
  Crown,
  SearchX,
} from 'lucide-react'
import { PageHeader, SectionCard, EmptyState, Chip } from '../components/ui/kit'
import useMembershipStore from '../stores/membershipStore'
import PremiumGate, { PlatinumBadge, TrialBanner } from '../components/premium/PremiumGate'
import HealthScoreTool from '../components/tools/HealthScoreTool'
import BudgetTool from '../components/tools/BudgetTool'
import SavingsGoalTool from '../components/tools/SavingsGoalTool'
import DebtPayoffTool from '../components/tools/DebtPayoffTool'
import WealthProjectionTool from '../components/tools/WealthProjectionTool'
import DebtStrategyTool from '../components/tools/DebtStrategyTool'

/*
  Catálogo de Herramientas (rediseño Kipu — ver Doc/PLAN_HERRAMIENTAS.md):
  grid de cards con buscador y filtro por categoría. Las Herramientas+
  (Platinum) se ven pero no se ejecutan sin permiso: el estado viene del
  backend y, aunque se manipule el cliente, los endpoints premium validan
  en el servidor de todos modos.
*/

const TOOLS = [
  {
    id: 'salud-financiera',
    name: 'Salud Financiera',
    description: 'Diagnostica tus finanzas con un puntaje de 0 a 100 y cuatro indicadores clave.',
    icon: Trophy,
    category: 'Diagnóstico',
    premium: false,
    component: HealthScoreTool,
  },
  {
    id: 'presupuesto',
    name: 'Presupuesto mensual',
    description: 'Compara tu gasto real del mes contra el presupuesto que definas por categoría.',
    icon: Calculator,
    category: 'Planificación',
    premium: false,
    component: BudgetTool,
  },
  {
    id: 'metas-ahorro',
    name: 'Metas de Ahorro',
    description: 'Mide tu avance hacia una meta y estima cuándo la alcanzarás con tu aporte mensual.',
    icon: PiggyBank,
    category: 'Planificación',
    premium: false,
    component: SavingsGoalTool,
  },
  {
    id: 'pago-deudas',
    name: 'Pago de Deudas',
    description: 'Calcula en cuántos meses saldas una deuda y cuánto pagarás de intereses.',
    icon: DollarSign,
    category: 'Deudas',
    premium: false,
    component: DebtPayoffTool,
  },
  {
    id: 'proyeccion-patrimonio',
    name: 'Proyección de patrimonio',
    description: 'Proyecta tu dinero a futuro con interés compuesto y aportes mensuales.',
    icon: TrendingUp,
    category: 'Herramientas+',
    premium: true,
    component: WealthProjectionTool,
  },
  {
    id: 'plan-deudas',
    name: 'Plan acelerado de deudas',
    description: 'Compara bola de nieve vs. avalancha con varias deudas y un pago extra.',
    icon: Layers,
    category: 'Herramientas+',
    premium: true,
    component: DebtStrategyTool,
  },
]

const CATEGORIES = ['Todas', 'Diagnóstico', 'Planificación', 'Deudas', 'Herramientas+']

const CardSkeleton = () => (
  <div className="bg-card rounded-[2rem] border border-subtle shadow-xl p-6">
    <div className="h-11 w-11 rounded-2xl loading-pulse" />
    <div className="mt-4 h-4 w-2/3 rounded loading-pulse" />
    <div className="mt-2.5 h-3 w-full rounded loading-pulse" />
    <div className="mt-1.5 h-3 w-4/5 rounded loading-pulse" />
  </div>
)

const FinancialTools = () => {
  const { membresia, loading, fetchMembresia } = useMembershipStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todas')
  const [activeToolId, setActiveToolId] = useState<string | null>(null)

  useEffect(() => { fetchMembresia() /* estado real desde el backend */ }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const desbloqueado = membresia?.estado === 'PLATINUM' || membresia?.estado === 'TRIAL_ACTIVO'
  const enTrial = membresia?.estado === 'TRIAL_ACTIVO'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return TOOLS.filter((t) => {
      if (category !== 'Todas' && t.category !== category) return false
      if (q && !`${t.name} ${t.description}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [query, category])

  const activeTool = TOOLS.find((t) => t.id === activeToolId)

  /* ---- Vista de detalle de una herramienta ---- */
  if (activeTool) {
    const Tool = activeTool.component
    const body = (
      <SectionCard
        title={
          <span className="flex items-center gap-2.5">
            {activeTool.name}
            {activeTool.premium && (enTrial ? <span className="badge-success">En trial</span> : <PlatinumBadge />)}
          </span>
        }
        action={
          <button
            onClick={() => setActiveToolId(null)}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted hover:text-main transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Catálogo
          </button>
        }
      >
        <p className="text-sm text-muted -mt-3 mb-6">{activeTool.description}</p>
        <Tool />
      </SectionCard>
    )

    return (
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <PageHeader title="Herramientas" subtitle="Calculadoras y planes para ordenar tus finanzas, nudo por nudo" />
        {activeTool.premium
          ? <PremiumGate feature={activeTool.name}>{body}</PremiumGate>
          : <>{enTrial && <TrialBanner />}{body}</>}
      </motion.div>
    )
  }

  /* ---- Catálogo ---- */
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <PageHeader
        title="Herramientas"
        subtitle="Calculadoras y planes para ordenar tus finanzas, nudo por nudo"
      />

      <TrialBanner />

      {/* Buscador + filtro por categoría */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative lg:max-w-xs w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar herramienta…"
            aria-label="Buscar herramienta"
            className="input-field input-field--with-prefix-icon"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 lg:pb-0" role="tablist" aria-label="Categorías">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              role="tab"
              aria-selected={category === c}
              className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                category === c
                  ? 'bg-brand-primary text-white dark:text-brand-dark shadow'
                  : 'bg-base/60 border border-subtle text-muted hover:text-main'
              }`}
            >
              {c === 'Herramientas+' ? (
                <span className="inline-flex items-center gap-1"><Crown className="w-3 h-3" /> Herramientas+</span>
              ) : c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid del catálogo */}
      {loading && !membresia ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={SearchX}
            title="Sin resultados"
            message={`No hay herramientas que coincidan con "${query}". Prueba con otro término o cambia de categoría.`}
          />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tool) => {
            const locked = tool.premium && !desbloqueado
            const Icon = tool.icon
            return (
              <button
                key={tool.id}
                onClick={() => setActiveToolId(tool.id)}
                aria-label={`${tool.name}${locked ? ' (requiere Platinum)' : ''}`}
                className={`text-left bg-card rounded-[2rem] border border-subtle shadow-xl p-6 transition-all hover:shadow-2xl hover:-translate-y-0.5 focus-ring cursor-pointer ${
                  locked ? 'opacity-75 hover:opacity-100' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${
                    locked
                      ? 'bg-taupe-500/15 text-taupe-600 dark:text-sand-300'
                      : 'bg-primary/10 text-primary dark:text-primary-300'
                  }`}>
                    {locked ? <Lock className="w-5 h-5" strokeWidth={2.25} /> : <Icon className="w-5 h-5" strokeWidth={2.25} />}
                  </div>
                  {tool.premium
                    ? (enTrial
                        ? <span className="badge-success">En trial</span>
                        : membresia?.estado === 'PLATINUM'
                          ? <span className="badge-info"><Crown className="w-2.5 h-2.5" /> Incluida</span>
                          : <PlatinumBadge />)
                    : <span className="badge bg-sage-600/10 text-sage-700 dark:text-sage-300 border border-sage-600/20">Disponible</span>}
                </div>
                <h3 className="mt-4 text-base font-bold tracking-tight text-main">{tool.name}</h3>
                <p className="mt-1.5 text-sm text-muted leading-relaxed">{tool.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <Chip>{tool.category}</Chip>
                  <span className={`text-xs font-bold uppercase tracking-wider ${locked ? 'text-taupe-500' : 'text-primary dark:text-primary-300'}`}>
                    {locked ? 'Ver Platinum' : 'Abrir →'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

export default FinancialTools
