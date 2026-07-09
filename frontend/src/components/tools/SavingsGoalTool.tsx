import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { formatCurrency } from '../../utils/formatters'
import { NumberField, validateAmount, ResultPanel, ResultStat } from './toolkit'

/*
  Metas de Ahorro: misma matemática original (% avance, meses = restante /
  aporte, fecha estimada con meses de 30 días). Mejora entrada/validación/salida.
*/
const SavingsGoalTool = () => {
  const [goal, setGoal] = useState({ target: '', current: '', monthlyContribution: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [result, setResult] = useState<any>(null)

  const set = (k: string) => (v: string) => {
    setGoal((p) => ({ ...p, [k]: v }))
    if (errors[k]) setErrors((p) => ({ ...p, [k]: '' }))
  }

  const calculate = () => {
    const nextErrors = {
      target: validateAmount(goal.target, { name: 'tu meta' }) ||
        (parseFloat(goal.target) === 0 ? 'La meta debe ser mayor a 0' : ''),
      current: validateAmount(goal.current, { name: 'tu ahorro actual' }),
      monthlyContribution: validateAmount(goal.monthlyContribution, { required: false }),
    }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    // ---- Matemática original (sin cambios) ----
    const target = parseFloat(goal.target) || 0
    const current = parseFloat(goal.current) || 0
    const contribution = parseFloat(goal.monthlyContribution) || 0
    const remaining = target - current
    const monthsNeeded = contribution > 0 ? Math.ceil(remaining / contribution) : 0

    setResult({
      percentage: ((current / target) * 100).toFixed(1),
      remaining,
      monthsNeeded,
      targetDate: monthsNeeded > 0
        ? new Date(Date.now() + monthsNeeded * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
        : null,
      achieved: remaining <= 0,
    })
  }

  const copyText = () =>
    result
      ? `Meta de ahorro Kipu: ${result.percentage}% completado. ${result.achieved ? '¡Meta lograda!' : `Faltan ${formatCurrency(result.remaining)}${result.monthsNeeded > 0 ? `, ~${result.monthsNeeded} meses (${result.targetDate})` : ''}.`}`
      : ''

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NumberField label="Meta de ahorro" value={goal.target} onChange={set('target')} error={errors.target} onEnter={calculate} />
        <NumberField label="Ahorro actual" value={goal.current} onChange={set('current')} error={errors.current} onEnter={calculate} />
        <NumberField label="Aporte mensual" value={goal.monthlyContribution} onChange={set('monthlyContribution')} error={errors.monthlyContribution} hint="Opcional: para estimar la fecha de logro" className="md:col-span-2" onEnter={calculate} />
      </div>

      <button onClick={calculate} className="btn-primary w-full mt-5">Calcular mi avance</button>

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <ResultPanel title="Avance hacia tu meta" copyText={copyText}>
            <div className="mb-4">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-sm font-semibold text-main">{result.achieved ? '¡Meta lograda!' : 'Progreso'}</span>
                <span className="text-sm font-bold font-display text-primary dark:text-primary-300">{result.percentage}%</span>
              </div>
              <div className="h-3 rounded-full bg-black/[0.05] dark:bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-brand-primary transition-all" style={{ width: `${Math.min(parseFloat(result.percentage), 100)}%` }} />
              </div>
            </div>
            {!result.achieved && (
              <div className="grid grid-cols-2 gap-3">
                <ResultStat value={formatCurrency(result.remaining)} label="Te falta" tone="primary" />
                {result.monthsNeeded > 0 ? (
                  <>
                    <ResultStat value={result.monthsNeeded} label={result.monthsNeeded === 1 ? 'Mes restante' : 'Meses restantes'} tone="sage" />
                    <div className="col-span-2 text-center p-3.5 bg-card rounded-2xl border border-subtle">
                      <p className="text-xs text-muted">Fecha estimada de logro</p>
                      <p className="mt-0.5 text-base font-bold text-main">{result.targetDate}</p>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-3.5 bg-card rounded-2xl border border-subtle flex items-center justify-center">
                    <p className="text-xs text-muted">Agrega un aporte mensual para estimar la fecha</p>
                  </div>
                )}
              </div>
            )}
          </ResultPanel>
        </motion.div>
      )}
    </div>
  )
}

export default SavingsGoalTool
