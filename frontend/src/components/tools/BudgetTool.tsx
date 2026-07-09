import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getDashboardData } from '../../services/api'
import { formatCurrency } from '../../utils/formatters'
import { NumberField } from './toolkit'

/*
  Presupuesto mensual — REPARADA (ver Doc/PLAN_HERRAMIENTAS.md §1-2):
  antes mostraba 4 presupuestos hardcodeados con gasto fijo en 0.
  Ahora el gasto real por categoría viene del endpoint existente
  /finance/dashboard (mes en curso) y los montos de presupuesto son
  editables; se guardan como preferencia de UI en localStorage.
*/

const STORAGE_KEY = 'kipu:budgets:v1'

const DEFAULT_BUDGETS = [
  { category: 'food', name: 'Comida', budget: 1000 },
  { category: 'transport', name: 'Transporte', budget: 500 },
  { category: 'entertainment', name: 'Entretenimiento', budget: 300 },
  { category: 'utilities', name: 'Servicios', budget: 400 },
]

const CATEGORY_NAMES: Record<string, string> = {
  food: 'Comida', transport: 'Transporte', entertainment: 'Entretenimiento',
  shopping: 'Compras', healthcare: 'Salud', utilities: 'Servicios',
  education: 'Educación', travel: 'Viajes', other: 'Otros', unclassified: 'Sin clasificar',
}

const loadBudgets = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch { /* preferencia corrupta → defaults */ }
  return DEFAULT_BUDGETS
}

const BudgetTool = () => {
  const [budgets, setBudgets] = useState(loadBudgets)
  const [spending, setSpending] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const monthLabel = useMemo(() => {
    const s = new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  }, [])

  const loadSpending = async () => {
    setLoading(true)
    setError(false)
    try {
      const now = new Date()
      const data = await getDashboardData({ month: now.getMonth() + 1, year: now.getFullYear() })
      const byCategory: Record<string, number> = {}
      for (const c of data?.categorySpending || []) {
        byCategory[c.category] = c.amount
      }
      setSpending(byCategory)
    } catch (e) {
      console.error('Error cargando gasto del mes:', e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSpending() }, [])

  const persist = (next) => {
    setBudgets(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* sin espacio */ }
  }

  const saveEdit = (category: string) => {
    const n = parseFloat(editValue)
    if (Number.isNaN(n) || n <= 0) {
      toast.error('El presupuesto debe ser un monto mayor a 0')
      return
    }
    persist(budgets.map((b) => (b.category === category ? { ...b, budget: n } : b)))
    setEditing(null)
    toast.success('Presupuesto actualizado')
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl loading-pulse" />)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm font-semibold text-main">No se pudo cargar tu gasto del mes</p>
        <button onClick={loadSpending} className="btn-secondary mt-4">
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted">Gasto real de <span className="font-semibold text-main">{monthLabel}</span> según tus movimientos.</p>
        <button onClick={loadSpending} aria-label="Actualizar gasto" className="p-1.5 rounded-lg text-muted hover:text-main hover:bg-base transition">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        {budgets.map((b) => {
          const spent = spending[b.category] || 0
          const pct = b.budget > 0 ? (spent / b.budget) * 100 : 0
          const over = pct > 100
          return (
            <div key={b.category} className="p-4 rounded-2xl bg-base/60 border border-subtle">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-sm font-semibold text-main">{CATEGORY_NAMES[b.category] || b.name}</span>
                <span className={`text-sm font-bold font-display tabular-nums ${over ? 'text-rose-500' : 'text-sage-600 dark:text-sage-300'}`}>
                  {formatCurrency(spent)} / {formatCurrency(b.budget)}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-black/[0.05] dark:bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${over ? 'bg-rose-500' : 'bg-brand-primary/80'}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted">{pct.toFixed(1)}% usado</span>
                <div className="flex items-center gap-3">
                  {over && (
                    <span className="text-rose-500 font-semibold inline-flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Sobre presupuesto
                    </span>
                  )}
                  {editing === b.category ? null : (
                    <button
                      onClick={() => { setEditing(b.category); setEditValue(String(b.budget)) }}
                      className="font-bold uppercase tracking-wider text-primary dark:text-primary-300"
                    >
                      Editar
                    </button>
                  )}
                </div>
              </div>
              {editing === b.category && (
                <div className="mt-3 flex items-end gap-2">
                  <NumberField
                    label="Nuevo presupuesto"
                    value={editValue}
                    onChange={setEditValue}
                    onEnter={() => saveEdit(b.category)}
                    className="flex-1"
                  />
                  <button onClick={() => saveEdit(b.category)} className="btn-primary !py-3">Guardar</button>
                  <button onClick={() => setEditing(null)} className="btn-secondary !py-3">Cancelar</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {Object.keys(spending).length === 0 && (
        <p className="mt-4 text-xs text-muted text-center">
          Aún no hay gastos este mes. Importa un estado de cuenta o sincroniza tu correo para ver el avance real.
        </p>
      )}
    </div>
  )
}

export default BudgetTool
