import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { Mail, RefreshCw, Unplug, ShieldCheck, Inbox, CheckCircle2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader, SectionCard, IconBadge } from '../components/ui/kit'
import { getGmailStatus, getGmailAuthUrl, syncGmail, disconnectGmail } from '../services/api'

/*
  Conexión Gmail (reemplaza a Outlook): OAuth de Google con permiso de SOLO
  LECTURA. Kipu únicamente consulta correos del remitente oficial del BCP
  (notificaciones@notificacionesbcp.com.pe); nada más del buzón se lee.
*/
const GmailConnect = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setStatus(await getGmailStatus())
    } catch (e) {
      console.error('Error consultando estado de Gmail:', e)
      toast.error('No se pudo consultar el estado de Gmail')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Resultado del callback de Google
    if (searchParams.get('connected')) {
      toast.success('Gmail conectado. Ya puedes sincronizar tus correos del BCP.')
      setSearchParams({}, { replace: true })
    } else if (searchParams.get('error')) {
      toast.error(`No se pudo conectar Gmail (${searchParams.get('error')})`)
      setSearchParams({}, { replace: true })
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleConnect = async () => {
    setWorking(true)
    try {
      const { url } = await getGmailAuthUrl()
      window.location.href = url // consentimiento de Google
    } catch (err) {
      const msg = err?.response?.data?.message || 'No se pudo iniciar la conexión'
      toast.error(msg)
      setWorking(false)
    }
  }

  const handleSync = async () => {
    setWorking(true)
    toast.loading('Leyendo tus correos del BCP…', { id: 'gmail-sync' })
    try {
      const r = await syncGmail()
      toast.success(
        `Sincronización lista: ${r.created} nuevo${r.created === 1 ? '' : 's'}, ${r.duplicates} duplicado${r.duplicates === 1 ? '' : 's'}${r.review ? `, ${r.review} en revisión` : ''}`,
        { id: 'gmail-sync' },
      )
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'La sincronización falló', { id: 'gmail-sync' })
    } finally {
      setWorking(false)
    }
  }

  const handleDisconnect = async () => {
    setWorking(true)
    try {
      await disconnectGmail()
      toast.success('Gmail desconectado. Tus movimientos importados se conservan.')
      load()
    } catch {
      toast.error('No se pudo desconectar')
    } finally {
      setWorking(false)
    }
  }

  const lastSync = status?.lastSync
    ? new Date(status.lastSync).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <PageHeader
        title="Correo BCP"
        subtitle="Conecta tu Gmail y Kipu convertirá las notificaciones del BCP en movimientos"
      />

      <SectionCard>
        {loading ? (
          <div className="space-y-3">
            <div className="h-16 rounded-2xl loading-pulse" />
            <div className="h-11 rounded-full loading-pulse" />
          </div>
        ) : !status?.configured ? (
          <div className="text-center py-6 max-w-md mx-auto">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-main">Gmail aún no está configurado en el servidor</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Faltan las credenciales de Google (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y
              GOOGLE_REDIRECT_URI) en el entorno del backend. Una vez configuradas, aquí
              aparecerá el botón para conectar tu cuenta.
            </p>
          </div>
        ) : !status?.connected ? (
          <div className="text-center py-6 max-w-md mx-auto">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 text-primary dark:text-primary-300 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-main">Conecta tu Gmail</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Kipu pedirá permiso de <strong>solo lectura</strong> y únicamente consultará los
              correos de <span className="font-mono text-xs">notificaciones@notificacionesbcp.com.pe</span>.
              Nada más de tu buzón se lee ni se almacena.
            </p>
            <button onClick={handleConnect} disabled={working} className="btn-primary mt-5">
              {working ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> : <Mail className="w-4 h-4" />}
              Conectar con Google
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3">
              <IconBadge icon={CheckCircle2} accent="emerald" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-main">Gmail conectado</p>
                <p className="text-xs text-muted truncate">
                  {status.email || 'Cuenta de Google'}{lastSync ? ` · última sincronización: ${lastSync}` : ' · aún sin sincronizar'}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
              <button onClick={handleSync} disabled={working} className="btn-primary flex-1">
                {working ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> : <RefreshCw className="w-4 h-4" />}
                Sincronizar ahora
              </button>
              <button onClick={handleDisconnect} disabled={working} className="btn-secondary">
                <Unplug className="w-4 h-4" /> Desconectar
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: ShieldCheck, title: 'Solo lectura', text: 'Permiso gmail.readonly: Kipu no puede enviar, borrar ni modificar correos.' },
          { icon: Inbox, title: 'Solo el BCP', text: 'La búsqueda filtra por el remitente oficial; el resto del buzón es invisible para Kipu.' },
          { icon: CheckCircle2, title: 'Sin duplicados', text: 'Cada correo pasa por el anti-duplicados de 3 niveles y el motor de reglas.' },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="bg-card rounded-[2rem] border border-subtle shadow-xl p-5">
            <Icon className="w-5 h-5 text-primary dark:text-primary-300" />
            <p className="mt-2.5 text-sm font-bold text-main">{title}</p>
            <p className="mt-1 text-xs text-muted leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default GmailConnect
