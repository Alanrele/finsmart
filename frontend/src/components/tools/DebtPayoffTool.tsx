import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import { NumberField, validateAmount, ResultPanel, ResultStat } from './toolkit'

/*
  Pago de Deudas: misma amortización original (meses = -ln(1 - P·i/C)/ln(1+i)).
  Mejora entrada, validación en vivo y resultado copiable.
*/
const DebtPayoffTool = () => {
  const [inputs, setInputs] = useState({ principal: '', interestRate: '', monthlyPayment: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [result, setResult] = useState<any>(null)

  const set = (k: string) => (v: string) => {
    setInputs((p) => ({ ...p, [k]: v }))
    if (errors[k]) setErrors((p) => ({ ...p, [k]: '' }))
  }

  const calculate = () => {
    const principal = parseFloat(inputs.principal) || 0
    const rate = (parseFloat(inputs.interestRate) || 0) / 100 / 12
    const payment = parseFloat(inputs.monthlyPayment) || 0

    const nextErrors = {
      principal: validateAmount(inputs.principal, { name: 'el monto de la deuda' }) || (principal === 0 ? 'La deuda debe ser mayor a 0' : ''),
      interestRate: validateAmount(inputs.interestRate, { name: 'la tasa anual' }),
      monthlyPayment: validateAmount(inputs.monthlyPayment, { name: 'tu pago mensual' }) || (payment === 0 ? 'El pago debe ser mayor a 0' : ''),
    }
    if (!nextErrors.monthlyPayment && payment > 0 && payment <= principal * rate) {
      nextErrors.monthlyPayment = `Con esa tasa, el interés del primer mes es ${formatCurrency(principal * rate)}: tu pago debe superarlo para reducir la deuda`
    }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    // ---- Matemática original (sin cambios) ----
    const months = Math.ceil(-Math.log(1 - (principal * rate) / payment) / Math.log(1 + rate))
    const totalPaid = payment * months
    const totalInterest = totalPaid - principal

    setResult({
      months,
      years: (months / 12).toFixed(1),
      totalPaid,
      totalInterest,
      interestPercentage: ((totalInterest / principal) * 100).toFixed(1),
    })
  }

  const copyText = () =>
    result
      ? `Plan de pago Kipu: deuda de ${formatCurrency(parseFloat(inputs.principal))} al ${inputs.interestRate}% anual, pagando ${formatCurrency(parseFloat(inputs.monthlyPayment))}/mes → ${result.months} meses (${result.years} años). Interés total ${formatCurrency(result.totalInterest)} (+${result.interestPercentage}%).`
      : ''

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NumberField label="Monto de la deuda" value={inputs.principal} onChange={set('principal')} error={errors.principal} onEnter={calculate} />
        <NumberField label="Tasa anual (TEA %)" value={inputs.interestRate} onChange={set('interestRate')} error={errors.interestRate} prefix="%" step="0.1" onEnter={calculate} />
        <NumberField label="Pago mensual" value={inputs.monthlyPayment} onChange={set('monthlyPayment')} error={errors.monthlyPayment} onEnter={calculate} />
      </div>

      <button onClick={calculate} className="btn-primary w-full mt-5">Calcular tiempo de pago</button>

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <ResultPanel title="Tu plan de pago" copyText={copyText}>
            <div className="grid grid-cols-2 gap-3">
              <ResultStat value={result.months} label="Meses para pagar" tone="primary" />
              <ResultStat value={result.years} label="Años" tone="main" />
              <ResultStat value={formatCurrency(result.totalInterest)} label="Interés total" tone="rose" />
              <ResultStat value={formatCurrency(result.totalPaid)} label="Total a pagar" tone="main" />
            </div>
            <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-main">Pagarás {result.interestPercentage}% adicional en intereses</p>
                <p className="mt-0.5 text-xs text-muted">Sube tu pago mensual para acortar el plazo y pagar menos intereses.</p>
              </div>
            </div>
          </ResultPanel>
        </motion.div>
      )}
    </div>
  )
}

export default DebtPayoffTool
