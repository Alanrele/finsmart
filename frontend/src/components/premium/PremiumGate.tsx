import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crown,
  Lock,
  Sparkles,
  MessageSquare,
  Wrench,
  Clock,
  CheckCircle2,
  X,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useMembershipStore from '../../stores/membershipStore'
import { activateTrial } from '../../services/api'

/*
  Gating visual de funciones Platinum (Chat IA+, Asistente IA+, Herramientas+).

  El estado SIEMPRE viene del backend (reloj del servidor). Este componente
  solo pinta: si el usuario manipula el cliente, cada endpoint premium
  responde 403 de todos modos.

  Uso: <PremiumGate feature="Chat IA+"> ...contenido premium... </PremiumGate>
*/

const BENEFICIOS = [
  { icon: MessageSquare, text: 'Chat IA+ ilimitado sobre tus finanzas reales' },
  { icon: Sparkles, text: 'Asistente IA+ con análisis y recomendaciones' },
  { icon: Wrench, text: 'Herramientas+ de planificación avanzada' },
]

/* Badge PLATINUM reutilizable (cards del catálogo, encabezados) */
export const PlatinumBadge = ({ className = '' }: { className?: string }) => (
  <span className={`badge bg-taupe-500/15 text-taupe-600 dark:text-sand-300 border border-taupe-500/25 ${className}`}>
    <Crown className="w-2.5 h-2.5" />
    Platinum
  </span>
)

/* Modal de confirmación del trial: el usuario lo activa explícitamente */
export const TrialConfirmModal = ({
  open,
  onClose,
  onActivated,
}: {
  open: boolean
  onClose: () => void
  onActivated?: () => void
}) => {
  const [activating, setActivating] = useState(false)
  const { setMembresia } = useMembershipStore()

  const handleActivate = async () => {
    setActivating(true)
    try {
      const data = await activateTrial()
      if (data?.membresia) setMembresia(data.membresia)
      toast.success('Trial Platinum activado: tienes 7 días completos')
      onActivated?.()
      onClose()
    } catch (err) {
      const code = err?.response?.data?.code
      if (code === 'TRIAL_YA_USADO') {
        toast.error('Tu trial gratuito ya fue utilizado y no puede reactivarse.')
        if (err.response.data.membresia) setMembresia(err.response.data.membresia)
        onClose()
      } else {
        toast.error('No se pudo activar el trial. Inténtalo de nuevo.')
      }
    } finally {
      setActivating(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !activating && onClose()}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            role="dialog" aria-modal="true"
            className="relative w-full sm:max-w-sm bg-card border border-subtle rounded-t-3xl sm:rounded-3xl shadow-xl p-6 safe-area-bottom"
          >
            <button onClick={onClose} className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:bg-base transition">
              <X className="w-4 h-4" />
            </button>
            <div className="h-11 w-11 rounded-2xl bg-taupe-500/15 text-taupe-600 dark:text-sand-300 flex items-center justify-center mb-4">
              <Crown className="w-5 h-5" strokeWidth={2.25} />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-main">Prueba Platinum gratis</h2>
            <p className="mt-1.5 text-sm text-muted">
              7 días completos de Chat IA+ y Herramientas+. Es una prueba de un solo uso:
              cuando termine, no podrá reactivarse.
            </p>
            <ul className="mt-4 space-y-2.5">
              {BENEFICIOS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-sm text-main/85">
                  <Icon className="w-4 h-4 text-primary dark:text-primary-300 shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
            <button onClick={handleActivate} disabled={activating} className="btn-primary w-full mt-5">
              {activating
                ? <><Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Activando…</>
                : 'Empezar mis 7 días gratis'}
            </button>
            <p className="mt-2.5 text-center text-[11px] text-muted">
              Sin tarjeta. El plazo corre desde este momento y se controla en el servidor.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/* Modal informativo de Platinum (CTA "Conocer Platinum") */
const PlatinumInfoModal = ({ open, onClose }) => (
  <AnimatePresence>
    {open && (
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          role="dialog" aria-modal="true"
          className="relative w-full sm:max-w-sm bg-card border border-subtle rounded-t-3xl sm:rounded-3xl shadow-xl p-6 safe-area-bottom"
        >
          <button onClick={onClose} className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:bg-base transition">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-11 w-11 rounded-2xl bg-taupe-500/15 text-taupe-600 dark:text-sand-300 flex items-center justify-center">
              <Crown className="w-5 h-5" strokeWidth={2.25} />
            </div>
            <PlatinumBadge />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-main">Kipu Platinum</h2>
          <p className="mt-1.5 text-sm text-muted">
            La membresía que anuda toda tu vida financiera con inteligencia artificial.
          </p>
          <ul className="mt-4 space-y-2.5">
            {BENEFICIOS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-sm text-main/85">
                <CheckCircle2 className="w-4 h-4 text-sage-600 dark:text-sage-300 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
          <div className="mt-5 p-3.5 rounded-2xl bg-base/60 border border-subtle">
            <p className="text-xs text-muted">
              La compra dentro de la app estará disponible pronto. Mientras tanto,
              escríbenos para activar tu membresía.
            </p>
          </div>
          <button onClick={onClose} className="btn-secondary w-full mt-4">Entendido</button>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
)

/* Banner del trial activo: días restantes, prominente el último día */
export const TrialBanner = () => {
  const membresia = useMembershipStore((s) => s.membresia)
  if (membresia?.estado !== 'TRIAL_ACTIVO') return null

  const dias = membresia.diasRestantes ?? 0
  const ultimoDia = dias <= 1
  const horas = Math.max(1, Math.floor((membresia.msRestantes ?? 0) / (60 * 60 * 1000)))

  return (
    <div
      role="status"
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${
        ultimoDia
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-taupe-500/10 border-taupe-500/20'
      }`}
    >
      <Clock className={`w-4 h-4 shrink-0 ${ultimoDia ? 'text-amber-500' : 'text-taupe-600 dark:text-sand-300'}`} />
      <p className="text-sm font-semibold text-main">
        {ultimoDia
          ? `Tu trial Platinum termina hoy: quedan menos de ${horas} hora${horas === 1 ? '' : 's'}.`
          : `Trial Platinum: quedan ${dias} días.`}
      </p>
      {ultimoDia && <PlatinumBadge className="ml-auto" />}
    </div>
  )
}

/* Overlay de bloqueo (estilo Kipu): explica el porqué y qué hacer */
const BlockedOverlay = ({ feature, membresia }) => {
  const [trialOpen, setTrialOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const expirado = membresia?.motivo === 'trial_expirado'

  return (
    <div className="flex items-center justify-center py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card border border-subtle rounded-[2rem] shadow-xl p-8 text-center"
      >
        <div className="mx-auto h-14 w-14 rounded-2xl bg-taupe-500/15 text-taupe-600 dark:text-sand-300 flex items-center justify-center">
          {expirado ? <Lock className="w-6 h-6" strokeWidth={2.25} /> : <Crown className="w-6 h-6" strokeWidth={2.25} />}
        </div>
        <div className="mt-4 flex justify-center"><PlatinumBadge /></div>

        <h2 className="mt-3 text-xl font-bold tracking-tight text-main">
          {expirado ? 'Tu prueba de 7 días terminó' : `${feature} es parte de Platinum`}
        </h2>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          {expirado
            ? 'El trial gratuito es de un solo uso y ya se agotó. Para seguir usando Chat IA+ y Herramientas+, pásate a Platinum.'
            : 'Analiza tus finanzas con IA, recibe recomendaciones y usa las herramientas avanzadas de planificación.'}
        </p>

        {!expirado && (
          <ul className="mt-5 space-y-2.5 text-left">
            {BENEFICIOS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-sm text-main/85">
                <Icon className="w-4 h-4 text-primary dark:text-primary-300 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 space-y-2.5">
          {!expirado && !membresia?.trialUsado && (
            <button onClick={() => setTrialOpen(true)} className="btn-primary w-full">
              Probar 7 días gratis
            </button>
          )}
          <button onClick={() => setInfoOpen(true)} className={expirado ? 'btn-primary w-full' : 'btn-secondary w-full'}>
            Conocer Platinum
          </button>
        </div>
      </motion.div>

      <TrialConfirmModal open={trialOpen} onClose={() => setTrialOpen(false)} />
      <PlatinumInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  )
}

/* Skeleton de carga del estado de membresía */
const GateSkeleton = () => (
  <div className="flex items-center justify-center py-10 px-4">
    <div className="w-full max-w-md bg-card border border-subtle rounded-[2rem] shadow-xl p-8">
      <div className="mx-auto h-14 w-14 rounded-2xl loading-pulse" />
      <div className="mt-5 h-5 w-2/3 mx-auto rounded loading-pulse" />
      <div className="mt-3 h-4 w-full rounded loading-pulse" />
      <div className="mt-2 h-4 w-5/6 mx-auto rounded loading-pulse" />
      <div className="mt-6 h-11 w-full rounded-full loading-pulse" />
    </div>
  </div>
)

const PremiumGate = ({ feature = 'Esta función', children }: { feature?: string; children: React.ReactNode }) => {
  const { membresia, loading, error, fetchMembresia } = useMembershipStore()

  useEffect(() => {
    fetchMembresia()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading && !membresia) return <GateSkeleton />

  if (error && !membresia) {
    return (
      <div className="flex items-center justify-center py-10 px-4">
        <div className="w-full max-w-md bg-card border border-subtle rounded-[2rem] shadow-xl p-8 text-center">
          <p className="text-sm font-semibold text-main">No pudimos verificar tu membresía</p>
          <p className="mt-1.5 text-sm text-muted">Revisa tu conexión e inténtalo de nuevo.</p>
          <button onClick={() => fetchMembresia()} className="btn-secondary w-full mt-5">
            <RefreshCw className="w-4 h-4" /> Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!membresia || membresia.estado === 'BLOQUEADO') {
    return <BlockedOverlay feature={feature} membresia={membresia} />
  }

  return (
    <div className="space-y-4">
      <TrialBanner />
      {children}
    </div>
  )
}

export default PremiumGate
