import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, RefreshCw, CheckCircle2, Loader2, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../stores/authStore'
import { getGmailStatus, syncGmail } from '../../services/api'

/*
  Tarjeta del dashboard: sincronización de correos BCP vía Gmail
  (reemplaza el control anterior basado en Outlook/Graph).
*/
const EmailSyncControl = () => {
  const { isAuthenticated } = useAuthStore()
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      setStatus(await getGmailStatus())
    } catch (e) {
      console.error('Error consultando Gmail:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) load()
  }, [isAuthenticated])

  const handleSync = async () => {
    setSyncing(true)
    toast.loading('Leyendo tus correos del BCP…', { id: 'gmail-sync' })
    try {
      const r = await syncGmail()
      toast.success(
        `${r.created} nuevo${r.created === 1 ? '' : 's'}, ${r.duplicates} duplicado${r.duplicates === 1 ? '' : 's'}${r.review ? `, ${r.review} en revisión` : ''}`,
        { id: 'gmail-sync' },
      )
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'La sincronización falló', { id: 'gmail-sync' })
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="h-14 rounded-2xl loading-pulse" />
      </div>
    )
  }

  const lastSync = status?.lastSync
    ? new Date(status.lastSync).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
            status?.connected
              ? 'bg-sage-600/10 text-sage-600 dark:text-sage-300'
              : 'bg-primary/10 text-primary dark:text-primary-300'
          }`}>
            {status?.connected ? <CheckCircle2 className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-serif italic text-main">Sincronización de Correos BCP</h3>
            <p className="text-xs text-muted truncate">
              {!status?.configured
                ? 'Gmail sin configurar en el servidor'
                : status?.connected
                  ? `${status.email || 'Gmail conectado'}${lastSync ? ` · última: ${lastSync}` : ' · aún sin sincronizar'}`
                  : 'Conecta tu Gmail para importar tus notificaciones del BCP automáticamente'}
            </p>
          </div>
        </div>

        {status?.connected ? (
          <button onClick={handleSync} disabled={syncing} className="btn-primary whitespace-nowrap">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> : <RefreshCw className="w-4 h-4" />}
            Sincronizar
          </button>
        ) : (
          <Link to="/gmail" className="btn-secondary whitespace-nowrap">
            Conectar Gmail <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  )
}

export default EmailSyncControl
