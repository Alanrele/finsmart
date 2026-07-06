import React, { useEffect, useState } from 'react'
import { KeyRound, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getPdfCredentials, deletePdfCredential } from '../../services/api'
import ConfirmDialog from '../common/ConfirmDialog'

/*
  Credenciales de PDF guardadas (cifradas con AES-256 en el servidor).
  El usuario solo ve la etiqueta y cuándo se usó — nunca la contraseña en claro.
  Puede borrarlas. Son SEPARADAS de las API keys de conexiones externas.
*/
const SavedPdfCredentials = () => {
  const [creds, setCreds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const { credentials } = await getPdfCredentials()
      setCreds(credentials || [])
    } catch { toast.error('No se pudieron cargar las credenciales') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deletePdfCredential(confirmId)
      setCreds((c) => c.filter((x) => x.id !== confirmId))
      toast.success('Credencial eliminada')
    } catch { toast.error('Error al eliminar') }
    finally { setDeleting(false); setConfirmId(null) }
  }

  return (
    <div className="card">
      <h2 className="text-lg font-serif italic text-main">Credenciales de PDF guardadas</h2>
      <p className="text-xs text-muted mt-0.5 mb-4">
        Se guardan cifradas (AES-256) y solo se usan para abrir tus PDFs. No son tus conexiones externas.
      </p>

      {loading ? (
        <p className="text-sm text-muted py-4 text-center">Cargando…</p>
      ) : creds.length === 0 ? (
        <p className="text-sm text-muted py-4 text-center">No tienes credenciales de PDF guardadas.</p>
      ) : (
        <ul className="divide-y divide-subtle">
          {creds.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-4 h-4 text-primary dark:text-primary-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-main truncate">{c.label}</p>
                <p className="text-[11px] text-muted mt-0.5">
                  {c.lastUsedAt ? `Usada el ${new Date(c.lastUsedAt).toLocaleDateString()}` : 'Sin usar aún'}
                </p>
              </div>
              <button onClick={() => setConfirmId(c.id)} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!confirmId}
        title="¿Eliminar esta credencial?"
        message="Tendrás que ingresar la contraseña de nuevo la próxima vez que subas un PDF protegido con ella."
        confirmLabel="Eliminar"
        tone="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}

export default SavedPdfCredentials
