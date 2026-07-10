import React, { useEffect, useState } from 'react'
import { Inbox, X, RefreshCw, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getEmailReviews, dismissEmailReview } from '../../services/api'

/*
  Bandeja de revisión (Configuración): correos del BCP que NO pudieron
  convertirse en movimiento (etiqueta faltante o formato desconocido).
  Nada se inventa: aquí el usuario ve el motivo exacto y puede descartarlos.
*/
const EmailReviewTray = () => {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await getEmailReviews()
      setReviews(data?.reviews || [])
    } catch (e) {
      console.error('Error cargando bandeja de revisión:', e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDismiss = async (id: string) => {
    try {
      await dismissEmailReview(id)
      setReviews((prev) => prev.filter((r) => r.id !== id))
      toast.success('Correo descartado de la bandeja')
    } catch {
      toast.error('No se pudo descartar el correo')
    }
  }

  const formatDate = (d?: string) => {
    if (!d) return ''
    const date = new Date(d)
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <Inbox className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-serif italic text-main">Bandeja de revisión</h2>
            <p className="text-xs text-muted mt-0.5">
              Correos del BCP que no pudieron convertirse en movimientos. Kipu nunca inventa datos:
              si falta un campo, el correo queda aquí.
            </p>
          </div>
        </div>
        <button onClick={load} aria-label="Actualizar bandeja" className="p-2 rounded-lg text-muted hover:text-main hover:bg-base transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <div key={i} className="h-16 rounded-2xl loading-pulse" />)}
        </div>
      ) : error ? (
        <div className="text-center py-6">
          <p className="text-sm font-semibold text-main">No se pudo cargar la bandeja</p>
          <button onClick={load} className="btn-secondary mt-3"><RefreshCw className="w-4 h-4" /> Reintentar</button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8">
          <div className="mx-auto h-11 w-11 rounded-2xl bg-sage-600/10 text-sage-600 dark:text-sage-300 flex items-center justify-center mb-3">
            <Inbox className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-main">Todo en orden</p>
          <p className="text-xs text-muted mt-1">No hay correos pendientes de revisión.</p>
        </div>
      ) : (
        <ul className="divide-y divide-subtle">
          {reviews.map((r) => (
            <li key={r.id} className="py-3.5 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-main truncate">{r.subject || 'Correo sin asunto'}</p>
                <p className="text-xs text-muted mt-0.5">
                  <span className="font-mono">{formatDate(r.receivedAt || r.createdAt)}</span>
                  {' · '}
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">{r.reason}</span>
                </p>
                {r.snippet && (
                  <p className="text-[11px] text-muted mt-1 line-clamp-2 font-mono">{r.snippet}</p>
                )}
              </div>
              <button
                onClick={() => handleDismiss(r.id)}
                aria-label="Descartar correo"
                className="p-1.5 rounded-lg text-muted hover:text-rose-500 hover:bg-rose-500/10 transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default EmailReviewTray
