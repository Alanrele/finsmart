import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Loader2 } from 'lucide-react'

/*
  Diálogo de confirmación para acciones destructivas o irreversibles.
  Bottom-sheet en móvil, tarjeta centrada en escritorio (GUIA_DE_ESTILO §9).
  No cambia ninguna lógica de negocio: solo intermedia la confirmación.
*/
const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger', // 'danger' | 'primary'
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const confirmClass =
    tone === 'danger'
      ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-red-600/15'
      : 'bg-primary hover:bg-primary-600 active:bg-primary-700 shadow-primary/15'

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={loading ? undefined : onCancel}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative w-full sm:max-w-sm bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-xl p-6 safe-area-bottom"
          >
            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center mb-4 ${
              tone === 'danger' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-primary/10 text-primary dark:text-primary-300'
            }`}>
              <AlertTriangle className="w-5 h-5" strokeWidth={2.25} />
            </div>

            <h2 id="confirm-title" className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {title}
            </h2>
            {message && (
              <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {message}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button
                onClick={onCancel}
                disabled={loading}
                className="min-h-[44px] px-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-800 text-sm font-black text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`min-h-[44px] px-5 rounded-xl text-sm font-black text-white shadow-lg transition inline-flex items-center justify-center gap-2 disabled:opacity-60 ${confirmClass}`}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default ConfirmDialog
