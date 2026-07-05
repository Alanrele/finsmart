import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileUp, Lock, Loader2, CheckCircle2, AlertTriangle, X, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { processPdf, unlockPdf } from '../../services/api'

/*
  Subida de estados de cuenta en PDF con manejo de contraseña recordable.
  Flujo:
   1. Drag & drop o selección de uno o varios PDFs.
   2. Por cada archivo se llama processPdf. Si el backend responde
      password_required, se abre el modal para ingresar la credencial.
   3. unlockPdf reintenta; si "recordar", el backend cifra y guarda la clave,
      y los próximos archivos la reutilizan automáticamente.
   4. Resumen por archivo: nuevos / duplicados / sin clasificar / no procesable.
*/
const PdfUpload = ({ onImported }) => {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [queue, setQueue] = useState<any[]>([]) // [{ file, status, summary, error }] // TODO: tipar
  const [pwdModal, setPwdModal] = useState(null) // { file, index, error }
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [unlocking, setUnlocking] = useState(false)

  const summarize = (fileName, resp) => {
    if (resp.status === 'unprocessable') {
      return { status: 'unprocessable', message: resp.message }
    }
    const s = resp.summary || {}
    return {
      status: 'done',
      message: `${s.new} nuevo${s.new === 1 ? '' : 's'}, ${s.duplicates} duplicado${s.duplicates === 1 ? '' : 's'}, ${s.unclassified} sin clasificar`,
      summary: s,
    }
  }

  const processOne = useCallback(async (file, index) => {
    setQueue((q) => q.map((it, i) => (i === index ? { ...it, status: 'processing' } : it)))
    try {
      const resp = await processPdf(file)
      const result = summarize(file.name, resp)
      setQueue((q) => q.map((it, i) => (i === index ? { ...it, ...result } : it)))
      if (result.summary?.new > 0) toast.success(`${file.name}: ${result.summary.new} movimientos importados`)
      if (result.status === 'unprocessable') toast(`${file.name}: no procesable`, { icon: '⚠️' })
      onImported?.()
    } catch (err) {
      const code = err?.response?.data?.error
      if (err?.response?.status === 401 && code === 'password_required') {
        // Necesita credencial → abrir modal
        setQueue((q) => q.map((it, i) => (i === index ? { ...it, status: 'locked' } : it)))
        setPwdModal({ file, index, error: null })
        setPassword('')
      } else {
        const msg = err?.response?.data?.message || err.message || 'Error al procesar'
        setQueue((q) => q.map((it, i) => (i === index ? { ...it, status: 'error', message: msg } : it)))
        toast.error(`${file.name}: ${msg}`)
      }
    }
  }, [onImported])

  const enqueue = useCallback((fileList: FileList | File[]) => {
    const pdfs = Array.from(fileList).filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
    if (pdfs.length === 0) {
      toast.error('Solo se aceptan archivos PDF')
      return
    }
    const startIndex = queue.length
    setQueue((q) => [...q, ...pdfs.map((file) => ({ file, status: 'pending' }))])
    pdfs.forEach((file, i) => processOne(file, startIndex + i))
  }, [queue.length, processOne])

  const handleUnlock = async () => {
    if (!pwdModal || !password) return
    setUnlocking(true)
    try {
      const resp = await unlockPdf(pwdModal.file, {
        password,
        remember,
        label: pwdModal.file.name.replace(/\.pdf$/i, ''),
      })
      const result = summarize(pwdModal.file.name, resp)
      setQueue((q) => q.map((it, i) => (i === pwdModal.index ? { ...it, ...result } : it)))
      if (result.summary?.new > 0) toast.success(`${pwdModal.file.name}: ${result.summary.new} movimientos importados`)
      if (resp.remembered) toast.success('Credencial guardada de forma segura')
      setPwdModal(null)
      setPassword('')
      onImported?.()
    } catch (err) {
      const code = err?.response?.data?.error
      if (code === 'password_incorrect') {
        setPwdModal((m) => ({ ...m, error: 'La credencial es incorrecta. Inténtalo de nuevo.' }))
      } else {
        toast.error(err?.response?.data?.message || 'Error al desbloquear el PDF')
      }
    } finally {
      setUnlocking(false)
    }
  }

  const statusIcon = (status) => {
    if (status === 'processing' || status === 'pending') return <Loader2 className="w-4 h-4 text-primary animate-spin motion-reduce:animate-none" />
    if (status === 'done') return <CheckCircle2 className="w-4 h-4 text-sage-600" />
    if (status === 'locked') return <Lock className="w-4 h-4 text-amber-500" />
    if (status === 'unprocessable' || status === 'error') return <AlertTriangle className="w-4 h-4 text-red-500" />
    return <FileText className="w-4 h-4 text-zinc-400" />
  }

  return (
    <div className="card">
      <span className="eyebrow">Importar</span>
      <h3 className="mt-2 text-[15px] font-bold text-zinc-900 dark:text-zinc-50">Estados de cuenta en PDF</h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-4">
        Arrastra tus PDFs del BCP o selecciónalos. Si están protegidos, te pediremos la credencial una sola vez.
      </p>

      {/* Zona drag & drop */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); enqueue(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed transition p-8 flex flex-col items-center justify-center text-center ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-zinc-200 dark:border-zinc-700 hover:border-primary/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
        }`}
      >
        <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
          <FileUp className="w-5 h-5 text-primary dark:text-primary-300" strokeWidth={2.25} />
        </div>
        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Suelta tus PDFs aquí</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">o haz clic para seleccionar · uno o varios</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => { enqueue(e.target.files); e.target.value = '' }}
        />
      </div>

      {/* Cola de archivos */}
      {queue.length > 0 && (
        <ul className="mt-4 space-y-2">
          {queue.map((item, i) => (
            <li key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40">
              {statusIcon(item.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">{item.file.name}</p>
                {item.message && (
                  <p className={`text-xs mt-0.5 ${item.status === 'error' || item.status === 'unprocessable' ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
                    {item.message}
                  </p>
                )}
                {item.status === 'locked' && (
                  <button
                    onClick={() => { setPwdModal({ file: item.file, index: i, error: null }); setPassword('') }}
                    className="text-xs font-bold text-primary dark:text-primary-300 mt-0.5"
                  >
                    Ingresar credencial
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal de contraseña */}
      <AnimatePresence>
        {pwdModal && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !unlocking && setPwdModal(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full sm:max-w-sm bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-xl p-6 safe-area-bottom"
            >
              <button onClick={() => setPwdModal(null)} className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                <X className="w-4 h-4" />
              </button>
              <div className="h-11 w-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" strokeWidth={2.25} />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">PDF protegido</h2>
              <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                Este PDF requiere una credencial. Ingrésala para continuar con <span className="font-semibold text-zinc-700 dark:text-zinc-300">{pwdModal.file.name}</span>.
              </p>

              <label className="micro-label block mt-5 mb-2">Credencial del PDF</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                autoFocus
                className={`input-field ${pwdModal.error ? 'border-red-300 dark:border-red-800 focus:ring-red-500/20' : ''}`}
                placeholder="••••••••"
              />
              {pwdModal.error && <p className="mt-1.5 text-xs font-semibold text-red-500">{pwdModal.error}</p>}

              <label className="mt-4 flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded text-primary focus:ring-primary/40" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Recordar credencial para futuros PDFs</span>
              </label>
              <p className="mt-1 text-[11px] text-zinc-400 leading-relaxed">
                Se guarda cifrada (AES-256) y separada de tus conexiones externas. Puedes borrarla en Configuración.
              </p>

              <button
                onClick={handleUnlock}
                disabled={!password || unlocking}
                className="btn-primary w-full mt-5"
              >
                {unlocking ? <><Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Desbloqueando…</> : 'Desbloquear'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PdfUpload
