import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { formatCurrency, formatCurrencyAuto } from '../../utils/formatters'
import { NumberField, validateAmount, ResultPanel, ResultStat } from './toolkit'

/*
  Proyección de patrimonio (Herramientas+ · Platinum, nueva):
  interés compuesto con aportes mensuales, capitalización mensual.
*/
const WealthProjectionTool = () => {
  const [inputs, setInputs] = useState({ initial: '', monthly: '', rate: '', years: '10' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [result, setResult] = useState<any>(null)

  const set = (k: string) => (v: string) => {
    setInputs((p) => ({ ...p, [k]: v }))
    if (errors[k]) setErrors((p) => ({ ...p, [k]: '' }))
  }

  const calculate = () => {
    const initial = parseFloat(inputs.initial) || 0
    const monthly = parseFloat(inputs.monthly) || 0
    const years = parseInt(inputs.years, 10) || 0

    const nextErrors = {
      initial: validateAmount(inputs.initial, { required: false }),
      monthly: validateAmount(inputs.monthly, { required: false }),
      rate: validateAmount(inputs.rate, { name: 'la rentabilidad anual' }),
      years: !inputs.years.trim() ? 'Ingresa los años' : years < 1 || years > 60 ? 'Entre 1 y 60 años' : '',
    }
    if (!nextErrors.initial && !nextErrors.monthly && initial === 0 && monthly === 0) {
      nextErrors.monthly = 'Ingresa un capital inicial o un aporte mensual'
    }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    const monthlyRate = (parseFloat(inputs.rate) || 0) / 100 / 12
    let balance = initial
    const series = [{ year: 0, value: Math.round(balance), aportado: Math.round(initial) }]
    let contributed = initial
    for (let m = 1; m <= years * 12; m++) {
      balance = balance * (1 + monthlyRate) + monthly
      contributed += monthly
      if (m % 12 === 0) {
        series.push({ year: m / 12, value: Math.round(balance), aportado: Math.round(contributed) })
      }
    }

    setResult({
      final: balance,
      contributed,
      interest: balance - contributed,
      series,
      years,
    })
  }

  const copyText = () =>
    result
      ? `Proyección Kipu a ${result.years} años: patrimonio final ${formatCurrency(result.final)} (aportado ${formatCurrency(result.contributed)}, rendimiento ${formatCurrency(result.interest)}) con ${inputs.rate}% anual.`
      : ''

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NumberField label="Capital inicial" value={inputs.initial} onChange={set('initial')} error={errors.initial} onEnter={calculate} />
        <NumberField label="Aporte mensual" value={inputs.monthly} onChange={set('monthly')} error={errors.monthly} onEnter={calculate} />
        <NumberField label="Rentabilidad anual (%)" value={inputs.rate} onChange={set('rate')} error={errors.rate} prefix="%" step="0.1" hint="Ej.: 6 para un fondo conservador, 10 para renta variable" onEnter={calculate} />
        <NumberField label="Años de horizonte" value={inputs.years} onChange={set('years')} error={errors.years} prefix="" step="1" onEnter={calculate} />
      </div>

      <button onClick={calculate} className="btn-primary w-full mt-5">Proyectar mi patrimonio</button>

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <ResultPanel title={`Proyección a ${result.years} años`} copyText={copyText}>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <ResultStat value={formatCurrencyAuto(result.final)} label="Patrimonio final" tone="primary" />
              <ResultStat value={formatCurrencyAuto(result.contributed)} label="Total aportado" tone="main" />
              <ResultStat value={formatCurrencyAuto(result.interest)} label="Rendimiento" tone="sage" />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={result.series}>
                <defs>
                  <linearGradient id="wealthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3F7079" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3F7079" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="year" tickFormatter={(y) => `Año ${y}`} tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
                <YAxis tickFormatter={(v) => formatCurrencyAuto(v)} tick={{ fontSize: 11 }} stroke="var(--text-muted)" width={78} />
                <Tooltip
                  formatter={(value: any, name: any) => [formatCurrency(value), name === 'value' ? 'Patrimonio' : 'Aportado']}
                  labelFormatter={(y) => `Año ${y}`}
                />
                <Area type="monotone" dataKey="aportado" stroke="#A79E82" strokeWidth={1.5} fill="none" strokeDasharray="4 4" isAnimationActive={false} />
                <Area type="monotone" dataKey="value" stroke="#3F7079" strokeWidth={2.5} fill="url(#wealthFill)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
            <p className="mt-2 text-[11px] text-muted text-center">
              Línea punteada: lo que aportas · Área: patrimonio con interés compuesto (capitalización mensual)
            </p>
          </ResultPanel>
        </motion.div>
      )}
    </div>
  )
}

export default WealthProjectionTool
