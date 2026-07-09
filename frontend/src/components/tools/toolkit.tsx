import React from 'react'
import { Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

/*
  Piezas compartidas de las Herramientas Kipu: campos con validación en vivo
  y panel de resultados copiable. Solo presentación — la lógica de cálculo
  vive en cada herramienta.
*/

/* Campo de dinero/número con prefijo, validación en vivo y mensaje concreto */
export const NumberField = ({
  label,
  value,
  onChange,
  prefix = 'S/',
  placeholder = '0.00',
  error = '',
  hint = '',
  min,
  step = '0.01',
  className = '',
  onEnter,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  prefix?: string
  placeholder?: string
  error?: string
  hint?: string
  min?: number
  step?: string
  className?: string
  onEnter?: () => void
}) => (
  <div className={className}>
    <label className="micro-label block mb-2">{label}</label>
    <div className="relative">
      {prefix && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
        aria-invalid={Boolean(error)}
        className={`input-field ${prefix ? 'pl-10' : ''} ${
          error ? 'border-red-300 dark:border-red-800 focus:ring-red-500/20 focus:border-red-400' : ''
        }`}
        placeholder={placeholder}
      />
    </div>
    {error ? (
      <p className="mt-1.5 text-xs font-semibold text-red-500" role="alert">{error}</p>
    ) : hint ? (
      <p className="mt-1.5 text-xs text-muted">{hint}</p>
    ) : null}
  </div>
)

/* Valida un monto: devuelve '' si ok o el mensaje concreto del problema */
export const validateAmount = (
  raw: string,
  { required = true, min = 0, name = 'el monto' }: { required?: boolean; min?: number; name?: string } = {}
) => {
  if (!raw.trim()) return required ? `Ingresa ${name}` : ''
  const n = parseFloat(raw)
  if (Number.isNaN(n)) return 'Debe ser un número'
  if (n < min) return min === 0 ? 'No puede ser negativo' : `Debe ser mayor a ${min}`
  return ''
}

/* Botón "Copiar resumen" para resultados */
export const CopyButton = ({ getText, label = 'Copiar resumen' }: { getText: () => string; label?: string }) => {
  const [copied, setCopied] = React.useState(false)
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(getText())
      setCopied(true)
      toast.success('Resumen copiado al portapapeles')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('No se pudo copiar')
    }
  }
  return (
    <button
      onClick={handle}
      className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary dark:text-primary-300 hover:opacity-80 transition"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copiado' : label}
    </button>
  )
}

/* Panel de resultado estilo Kipu con encabezado y acción de copiado */
export const ResultPanel = ({
  title,
  copyText,
  children,
}: {
  title: string
  copyText?: () => string
  children: React.ReactNode
}) => (
  <div className="mt-6 p-5 rounded-3xl bg-primary/5 dark:bg-primary/10 border border-primary/15">
    <div className="flex items-center justify-between mb-4">
      <p className="micro-label">{title}</p>
      {copyText && <CopyButton getText={copyText} />}
    </div>
    {children}
  </div>
)

/* Celda de dato dentro de un resultado */
export const ResultStat = ({ value, label, tone = 'main' }: { value: React.ReactNode; label: string; tone?: string }) => {
  const tones: Record<string, string> = {
    main: 'text-main',
    primary: 'text-primary dark:text-primary-300',
    sage: 'text-sage-600 dark:text-sage-300',
    rose: 'text-rose-500',
    amber: 'text-amber-600 dark:text-amber-400',
  }
  return (
    <div className="text-center p-3.5 bg-card rounded-2xl border border-subtle">
      <p className={`text-xl font-bold font-display tabular-nums ${tones[tone] || tones.main}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  )
}
