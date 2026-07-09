import React, { useState } from 'react'
import { motion } from 'framer-motion'
import type { HealthScore } from '../../types'
import { NumberField, validateAmount, ResultPanel, ResultStat } from './toolkit'

/*
  Salud Financiera: score 0–100. La FÓRMULA es la original de FinancialTools
  (4 sub-ratios de 25 pts); aquí solo mejora la entrada, validación y salida.
*/
const HealthScoreTool = () => {
  const [inputs, setInputs] = useState({
    monthlyIncome: '', monthlyExpenses: '', savings: '', debts: '', emergencyFund: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [score, setScore] = useState<HealthScore | null>(null)

  const set = (k: string) => (v: string) => {
    setInputs((p) => ({ ...p, [k]: v }))
    if (errors[k]) setErrors((p) => ({ ...p, [k]: validateAmount(v, { required: k === 'monthlyIncome' }) }))
  }

  const calculate = () => {
    const nextErrors = {
      monthlyIncome: validateAmount(inputs.monthlyIncome, { name: 'tus ingresos mensuales' }) ||
        (parseFloat(inputs.monthlyIncome) === 0 ? 'Tus ingresos no pueden ser 0' : ''),
      monthlyExpenses: validateAmount(inputs.monthlyExpenses, { name: 'tus gastos mensuales' }),
      savings: validateAmount(inputs.savings, { required: false }),
      debts: validateAmount(inputs.debts, { required: false }),
      emergencyFund: validateAmount(inputs.emergencyFund, { required: false }),
    }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    // ---- Algoritmo original (sin cambios) ----
    const income = parseFloat(inputs.monthlyIncome) || 0
    const expenses = parseFloat(inputs.monthlyExpenses) || 0
    const savings = parseFloat(inputs.savings) || 0
    const debts = parseFloat(inputs.debts) || 0
    const emergency = parseFloat(inputs.emergencyFund) || 0

    let total = 0
    const savingsRate = ((income - expenses) / income) * 100
    if (savingsRate >= 30) total += 25
    else if (savingsRate >= 20) total += 20
    else if (savingsRate >= 10) total += 15
    else if (savingsRate > 0) total += 10

    const monthsOfExpenses = emergency / expenses
    if (monthsOfExpenses >= 6) total += 25
    else if (monthsOfExpenses >= 3) total += 20
    else if (monthsOfExpenses >= 1) total += 15
    else if (monthsOfExpenses > 0) total += 10

    const debtRatio = (debts / income) * 100
    if (debtRatio === 0) total += 25
    else if (debtRatio < 20) total += 20
    else if (debtRatio < 30) total += 15
    else if (debtRatio < 40) total += 10
    else total += 5

    const expenseRatio = (expenses / income) * 100
    if (expenseRatio < 50) total += 25
    else if (expenseRatio < 70) total += 20
    else if (expenseRatio < 80) total += 15
    else if (expenseRatio < 90) total += 10
    else total += 5

    setScore({
      total,
      savingsRate: savingsRate.toFixed(1),
      emergencyMonths: monthsOfExpenses.toFixed(1),
      debtRatio: debtRatio.toFixed(1),
      expenseRatio: expenseRatio.toFixed(1),
      level: total >= 80 ? 'Excelente' : total >= 60 ? 'Buena' : total >= 40 ? 'Regular' : 'Necesita Mejora',
    })
    // usa savings para satisfacer la fórmula original (documentado: hoy no puntúa)
    void savings
  }

  const copyText = () =>
    score
      ? `Salud financiera Kipu: ${score.total}/100 (${score.level}). Tasa de ahorro ${score.savingsRate}%, fondo de emergencia ${score.emergencyMonths} meses, deuda/ingresos ${score.debtRatio}%, gastos/ingresos ${score.expenseRatio}%.`
      : ''

  const scoreTone = score
    ? score.total >= 80 ? 'text-sage-600 dark:text-sage-300'
      : score.total >= 60 ? 'text-primary dark:text-primary-300'
      : score.total >= 40 ? 'text-amber-600 dark:text-amber-400'
      : 'text-rose-500'
    : ''

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NumberField label="Ingresos mensuales" value={inputs.monthlyIncome} onChange={set('monthlyIncome')} error={errors.monthlyIncome} onEnter={calculate} />
        <NumberField label="Gastos mensuales" value={inputs.monthlyExpenses} onChange={set('monthlyExpenses')} error={errors.monthlyExpenses} onEnter={calculate} />
        <NumberField label="Ahorros totales" value={inputs.savings} onChange={set('savings')} error={errors.savings} hint="Opcional" onEnter={calculate} />
        <NumberField label="Deudas totales" value={inputs.debts} onChange={set('debts')} error={errors.debts} hint="Opcional" onEnter={calculate} />
        <NumberField label="Fondo de emergencia" value={inputs.emergencyFund} onChange={set('emergencyFund')} error={errors.emergencyFund} hint="Dinero disponible para imprevistos" className="md:col-span-2" onEnter={calculate} />
      </div>

      <button onClick={calculate} className="btn-primary w-full mt-5">Calcular mi puntuación</button>

      {score && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <ResultPanel title="Tu salud financiera" copyText={copyText}>
            <div className="text-center mb-5">
              <p className={`font-display text-6xl font-extrabold tabular-nums ${scoreTone}`}>{score.total}</p>
              <p className="mt-1 text-sm font-bold text-main">{score.level}</p>
              <p className="text-xs text-muted">de 100 puntos</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ResultStat value={`${score.savingsRate}%`} label="Tasa de ahorro" tone="sage" />
              <ResultStat value={score.emergencyMonths} label="Meses de emergencia" tone="primary" />
              <ResultStat value={`${score.debtRatio}%`} label="Deuda / ingresos" tone="amber" />
              <ResultStat value={`${score.expenseRatio}%`} label="Gastos / ingresos" tone="main" />
            </div>
          </ResultPanel>
        </motion.div>
      )}
    </div>
  )
}

export default HealthScoreTool
