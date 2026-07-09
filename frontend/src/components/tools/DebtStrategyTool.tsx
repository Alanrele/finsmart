import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Snowflake, Mountain } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '../../utils/formatters'
import { NumberField, ResultPanel, ResultStat } from './toolkit'

/*
  Plan acelerado de deudas (Herramientas+ · Platinum, nueva):
  compara bola de nieve (menor saldo primero) vs. avalancha (mayor tasa
  primero) con un pago extra mensual. Simulación mes a mes.
*/

interface Debt { id: number; name: string; balance: string; rate: string; minPayment: string }

let nextId = 1
const emptyDebt = (): Debt => ({ id: nextId++, name: '', balance: '', rate: '', minPayment: '' })

const simulate = (debtsIn, extra, orderBy) => {
  // Copia de trabajo: [{ balance, monthlyRate, minPayment }]
  const debts = debtsIn.map((d) => ({ ...d }))
  let months = 0
  let totalInterest = 0
  const MAX_MONTHS = 1200 // corta simulaciones imposibles (100 años)

  while (debts.some((d) => d.balance > 0.005) && months < MAX_MONTHS) {
    months += 1
    // 1) interés del mes
    for (const d of debts) {
      if (d.balance <= 0) continue
      const interest = d.balance * d.monthlyRate
      d.balance += interest
      totalInterest += interest
    }
    // 2) pagos mínimos
    let extraPool = extra
    for (const d of debts) {
      if (d.balance <= 0) continue
      const pay = Math.min(d.minPayment, d.balance)
      d.balance -= pay
    }
    // 3) el extra ataca según la estrategia
    const alive = debts.filter((d) => d.balance > 0.005)
    alive.sort(orderBy)
    for (const d of alive) {
      if (extraPool <= 0) break
      const pay = Math.min(extraPool, d.balance)
      d.balance -= pay
      extraPool -= pay
    }
  }

  return months >= MAX_MONTHS ? null : { months, totalInterest }
}

const DebtStrategyTool = () => {
  const [debts, setDebts] = useState<Debt[]>([emptyDebt(), emptyDebt()])
  const [extra, setExtra] = useState('')
  const [result, setResult] = useState<any>(null)

  const update = (id: number, field: keyof Debt, value: string) =>
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)))

  const addDebt = () => setDebts((prev) => [...prev, emptyDebt()])
  const removeDebt = (id: number) => {
    if (debts.length <= 1) return
    setDebts((prev) => prev.filter((d) => d.id !== id))
  }

  const calculate = () => {
    const parsed: any[] = []
    for (const [i, d] of debts.entries()) {
      const balance = parseFloat(d.balance)
      const rate = parseFloat(d.rate)
      const minPayment = parseFloat(d.minPayment)
      if ([balance, rate, minPayment].some((n) => Number.isNaN(n))) {
        toast.error(`Completa saldo, tasa y pago mínimo de la deuda ${i + 1}`)
        return
      }
      if (balance <= 0) { toast.error(`El saldo de la deuda ${i + 1} debe ser mayor a 0`); return }
      const monthlyRate = rate / 100 / 12
      if (minPayment <= balance * monthlyRate) {
        toast.error(`El pago mínimo de "${d.name || `deuda ${i + 1}`}" no cubre su interés mensual (${formatCurrency(balance * monthlyRate)})`)
        return
      }
      parsed.push({ name: d.name || `Deuda ${i + 1}`, balance, monthlyRate, rate, minPayment })
    }
    const extraNum = parseFloat(extra) || 0
    if (extraNum < 0) { toast.error('El pago extra no puede ser negativo'); return }

    const snowball = simulate(parsed, extraNum, (a, b) => a.balance - b.balance)
    const avalanche = simulate(parsed, extraNum, (a, b) => b.monthlyRate - a.monthlyRate)
    if (!snowball || !avalanche) {
      toast.error('Con esos pagos la deuda no termina de pagarse; sube los montos')
      return
    }

    setResult({
      snowball,
      avalanche,
      saving: snowball.totalInterest - avalanche.totalInterest,
      extra: extraNum,
    })
  }

  const copyText = () =>
    result
      ? `Plan de deudas Kipu (extra ${formatCurrency(result.extra)}/mes): avalancha ${result.avalanche.months} meses con ${formatCurrency(result.avalanche.totalInterest)} de interés; bola de nieve ${result.snowball.months} meses con ${formatCurrency(result.snowball.totalInterest)}. La avalancha ahorra ${formatCurrency(Math.max(0, result.saving))}.`
      : ''

  return (
    <div>
      <div className="space-y-4">
        {debts.map((d, i) => (
          <div key={d.id} className="p-4 rounded-2xl bg-base/60 border border-subtle">
            <div className="flex items-center justify-between mb-3">
              <input
                value={d.name}
                onChange={(e) => update(d.id, 'name', e.target.value)}
                placeholder={`Deuda ${i + 1} (ej. Tarjeta BCP)`}
                className="bg-transparent text-sm font-semibold text-main placeholder:text-muted focus:outline-none flex-1"
              />
              {debts.length > 1 && (
                <button onClick={() => removeDebt(d.id)} aria-label="Quitar deuda" className="p-1.5 rounded-lg text-muted hover:text-rose-500 hover:bg-rose-500/10 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <NumberField label="Saldo" value={d.balance} onChange={(v) => update(d.id, 'balance', v)} onEnter={calculate} />
              <NumberField label="TEA (%)" value={d.rate} onChange={(v) => update(d.id, 'rate', v)} prefix="%" step="0.1" onEnter={calculate} />
              <NumberField label="Pago mínimo" value={d.minPayment} onChange={(v) => update(d.id, 'minPayment', v)} onEnter={calculate} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3">
        <button onClick={addDebt} className="btn-secondary !py-2.5">
          <Plus className="w-4 h-4" /> Agregar deuda
        </button>
        <NumberField label="Pago extra mensual (además de los mínimos)" value={extra} onChange={setExtra} className="flex-1" onEnter={calculate} />
      </div>

      <button onClick={calculate} className="btn-primary w-full mt-5">Comparar estrategias</button>

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <ResultPanel title="Bola de nieve vs. avalancha" copyText={copyText}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 bg-card rounded-2xl border border-subtle">
                <p className="flex items-center gap-2 text-sm font-bold text-main"><Snowflake className="w-4 h-4 text-primary dark:text-primary-300" /> Bola de nieve</p>
                <p className="text-[11px] text-muted mb-3">Primero el saldo más chico (motivación rápida)</p>
                <div className="grid grid-cols-2 gap-2">
                  <ResultStat value={result.snowball.months} label="Meses" tone="primary" />
                  <ResultStat value={formatCurrency(result.snowball.totalInterest)} label="Interés total" tone="rose" />
                </div>
              </div>
              <div className="p-4 bg-card rounded-2xl border border-subtle">
                <p className="flex items-center gap-2 text-sm font-bold text-main"><Mountain className="w-4 h-4 text-sage-600 dark:text-sage-300" /> Avalancha</p>
                <p className="text-[11px] text-muted mb-3">Primero la tasa más alta (menos intereses)</p>
                <div className="grid grid-cols-2 gap-2">
                  <ResultStat value={result.avalanche.months} label="Meses" tone="primary" />
                  <ResultStat value={formatCurrency(result.avalanche.totalInterest)} label="Interés total" tone="rose" />
                </div>
              </div>
            </div>
            <div className="mt-4 p-3.5 rounded-2xl bg-sage-600/10 border border-sage-600/20 text-center">
              <p className="text-sm font-semibold text-main">
                {result.saving > 0.01
                  ? <>La <strong>avalancha</strong> te ahorra {formatCurrency(result.saving)} en intereses</>
                  : 'Con tus números, ambas estrategias cuestan prácticamente lo mismo'}
              </p>
            </div>
          </ResultPanel>
        </motion.div>
      )}
    </div>
  )
}

export default DebtStrategyTool
