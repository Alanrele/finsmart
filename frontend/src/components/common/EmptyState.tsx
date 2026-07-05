import React from 'react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: React.ReactNode
  message?: React.ReactNode
  action?: React.ReactNode
}

/*
  Estado vacío con firma de marca (nudo de cordón) e invitación a actuar.
  Úsalo en lugar de textos sueltos cuando una lista o vista no tiene datos.
*/
const EmptyState = ({ icon: Icon, title, message, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center text-center py-12 px-4">
    <div className="relative mb-5">
      {/* Hebra anudada: firma visual del quipu */}
      <span className="absolute left-1/2 -top-4 -translate-x-1/2 h-4 w-0.5 bg-zinc-200 dark:bg-zinc-700" aria-hidden="true" />
      <div className="h-14 w-14 rounded-2xl bg-sand-100 dark:bg-zinc-800 flex items-center justify-center">
        {Icon && <Icon className="w-6 h-6 text-taupe-500 dark:text-taupe-300" strokeWidth={1.75} />}
      </div>
    </div>
    <h3 className="text-[15px] font-bold text-zinc-900 dark:text-zinc-50">{title}</h3>
    {message && (
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">{message}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
)

export default EmptyState
