import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/*
  Catálogo de componentes base con la ARQUITECTURA de la plantilla Kipu.
  Replican los patrones de composición (DOM, jerarquía, espaciado) de Kipu
  para que las vistas se construyan con ellos en vez de markup ad-hoc.
  Ver DOC/ARQUITECTURA_KIPU.md.
*/

// ---- PageHeader: encabezado de toda vista (título display + subtítulo + acción)
export const PageHeader = ({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
}) => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div>
      <h1 className="text-3xl font-extrabold font-display tracking-tight text-main">{title}</h1>
      {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
)

// ---- PrimaryButton: pill petróleo en mayúsculas (acción principal Kipu)
export const PrimaryButton = ({
  children,
  icon: Icon,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: LucideIcon }) => (
  <button
    {...props}
    className={`flex items-center justify-center gap-2 bg-brand-primary hover:opacity-90 text-white dark:text-brand-dark px-5 py-2.5 rounded-full font-bold text-xs tracking-wide uppercase shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${className}`}
  >
    {Icon && <Icon size={14} />}
    {children}
  </button>
)

// ---- SectionCard: card de contenido con título serif-italica (patrón Kipu)
export const SectionCard = ({
  title,
  action,
  children,
  className = '',
  padded = true,
}: {
  title?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  padded?: boolean
}) => (
  <div className={`bg-card ${padded ? 'p-8' : ''} rounded-[2.5rem] border border-subtle shadow-xl ${className}`}>
    {(title || action) && (
      <div className={`flex justify-between items-center mb-6 ${padded ? '' : 'p-8 pb-0'}`}>
        {title && <h2 className="text-lg font-serif italic text-main">{title}</h2>}
        {action}
      </div>
    )}
    {children}
  </div>
)

// ---- IconBadge: caja de icono teñida (usada en stat cards, listas)
const accentMap: Record<string, string> = {
  primary: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20',
  emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
}
export const IconBadge = ({
  icon: Icon,
  accent = 'primary',
  size = 18,
  className = '',
}: {
  icon: LucideIcon
  accent?: string
  size?: number
  className?: string
}) => (
  <div className={`p-2.5 rounded-2xl border shadow-sm shrink-0 ${accentMap[accent] || accentMap.primary} ${className}`}>
    <Icon size={size} />
  </div>
)

// ---- StatCard: KPI con glow ambiental (patrón distintivo de Kipu)
const glowMap: Record<string, string> = {
  primary: 'bg-brand-primary/15',
  emerald: 'bg-emerald-500/15',
  rose: 'bg-rose-500/15',
  amber: 'bg-amber-500/15',
}
export const StatCard = ({
  label,
  value,
  icon,
  accent = 'primary',
  caption,
  captionIcon: CaptionIcon,
  captionAccent,
}: {
  label: React.ReactNode
  value: React.ReactNode
  icon: LucideIcon
  accent?: string
  caption?: React.ReactNode
  captionIcon?: LucideIcon
  captionAccent?: string
}) => {
  const capColor =
    captionAccent === 'emerald' ? 'text-emerald-500'
    : captionAccent === 'rose' ? 'text-rose-500'
    : captionAccent === 'primary' ? 'text-brand-primary'
    : 'text-muted'
  return (
    <div className="bg-card/75 backdrop-blur-md p-6 rounded-[2rem] border border-subtle relative overflow-hidden flex flex-col justify-between h-36 shadow-xl">
      <div className={`absolute -right-6 -top-6 w-24 h-24 ${glowMap[accent] || glowMap.primary} rounded-full blur-2xl pointer-events-none`} />
      <div className="flex justify-between items-start z-10">
        <div className="min-w-0">
          <span className="text-[10px] font-extrabold text-muted uppercase tracking-widest block">{label}</span>
          <h3 className="text-2xl md:text-3xl font-extrabold font-display text-main tracking-tight mt-1.5 truncate">{value}</h3>
        </div>
        <IconBadge icon={icon} accent={accent} />
      </div>
      {caption && (
        <div className={`flex items-center gap-1.5 text-xs font-mono font-bold mt-3 z-10 ${capColor}`}>
          {CaptionIcon && <CaptionIcon size={14} />}
          <span className="tracking-wider text-[10px]">{caption}</span>
        </div>
      )}
    </div>
  )
}

// ---- Segmented: control segmentado (tabs internos)
export const Segmented = <T extends string>({
  options,
  value,
  onChange,
  className = '',
}: {
  options: { value: T; label: React.ReactNode }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) => (
  <div className={`flex bg-base/60 p-1 rounded-xl border border-subtle ${className}`}>
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onChange(opt.value)}
        className={`flex-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          value === opt.value
            ? 'bg-brand-primary text-white dark:text-brand-dark shadow-sm'
            : 'text-main/70 dark:text-muted hover:text-main'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
)

// ---- Field + inputs: label mono-mayúscula encima, input Kipu
export const Field = ({ label, children }: { label?: React.ReactNode; children: React.ReactNode }) => (
  <div>
    {label && <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5 font-mono">{label}</label>}
    {children}
  </div>
)

const inputBase =
  'w-full px-4 py-2.5 bg-base/50 border border-subtle rounded-xl text-sm text-main placeholder-muted focus:outline-none focus:border-brand-primary focus:bg-base transition-all'

export const TextInput = ({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={`${inputBase} ${className}`} />
)

export const SelectInput = ({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className={`${inputBase} cursor-pointer appearance-none ${className}`}>
    {children}
  </select>
)

// ---- Chip / Tag: etiqueta de categoría
export const Chip = ({ children, icon: Icon }: { children: React.ReactNode; icon?: LucideIcon }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-primary/10 text-brand-primary border border-brand-primary/15 rounded-lg text-[10px] font-bold uppercase tracking-wider">
    {Icon && <Icon size={10} />}
    {children}
  </span>
)

// ---- EmptyState (estilo Kipu: icono en círculo, título, mensaje)
export const EmptyState = ({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon?: LucideIcon
  title: React.ReactNode
  message?: React.ReactNode
  action?: React.ReactNode
}) => (
  <div className="text-center py-16 px-4">
    {Icon && (
      <div className="mx-auto w-12 h-12 bg-brand-primary/10 text-brand-primary border border-brand-primary/15 rounded-full flex items-center justify-center mb-4">
        <Icon size={24} />
      </div>
    )}
    <h3 className="text-sm font-bold text-main">{title}</h3>
    {message && <p className="text-xs text-muted mt-1.5 max-w-sm mx-auto">{message}</p>}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
)

// ---- Modal: overlay + cuerpo Kipu (icono + título display + X)
export const Modal = ({
  open,
  onClose,
  title,
  icon: Icon,
  children,
  maxWidth = 'max-w-md',
}: {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  icon?: LucideIcon
  children: React.ReactNode
  maxWidth?: string
}) => (
  <AnimatePresence>
    {open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={`relative bg-card w-full ${maxWidth} p-8 rounded-[2.5rem] border border-subtle shadow-2xl z-10`}
        >
          {(title || Icon) && (
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2.5">
                {Icon && (
                  <div className="p-2.5 bg-brand-primary/10 text-brand-primary rounded-xl">
                    <Icon size={20} />
                  </div>
                )}
                {title && <h3 className="text-lg font-bold font-display text-main">{title}</h3>}
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-base rounded-lg text-muted hover:text-main transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
          )}
          {children}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
)

// ---- ListRow: fila de lista estilo Kipu
export const ListRow = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`flex items-center justify-between py-3.5 group hover:bg-base/40 px-2.5 rounded-2xl transition-all ${className}`}>
    {children}
  </div>
)
