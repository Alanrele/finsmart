import React, { useState } from 'react'
import { PageHeader } from '../components/ui/kit'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Mail, Bell, Moon, Sun, Shield, Download, Trash2,
  Loader2, FileJson, FileSpreadsheet, X, Eye, EyeOff,
} from 'lucide-react'
import useAuthStore from '../stores/authStore'
import useAppStore from '../stores/appStore'
import { updatePreferences, updateProfile, deleteAccount, getTransactions } from '../services/api'
import toast from 'react-hot-toast'
import RulesManager from '../components/settings/RulesManager'
import SavedPdfCredentials from '../components/settings/SavedPdfCredentials'
import EmailReviewTray from '../components/settings/EmailReviewTray'

/*
  Configuración — todo lo que se ve aquí es REAL:
  - el perfil se edita y persiste (PATCH /auth/profile)
  - las preferencias se cargan del usuario y se guardan en el backend
  - exportar descarga un archivo de verdad (CSV/JSON con tus movimientos)
  - eliminar cuenta borra en el servidor, confirmado con tu contraseña
*/

/* Descarga un blob como archivo */
const downloadFile = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* Trae TODAS las transacciones paginando el endpoint existente */
const fetchAllTransactions = async () => {
  const all: any[] = []
  let page = 1
  for (;;) {
    const data = await getTransactions({ page, limit: 100 })
    const batch = data?.transactions || []
    all.push(...batch)
    if (!data?.pagination?.hasNext || batch.length === 0 || page >= 100) break
    page += 1
  }
  return all
}

const csvEscape = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const Settings = () => {
  const { user, updateUser, logout } = useAuthStore()
  const { theme, setTheme } = useAppStore()

  // Perfil editable
  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const profileDirty =
    profile.firstName !== (user?.firstName || '') || profile.lastName !== (user?.lastName || '')

  // Preferencias: se inicializan desde el USUARIO, no con valores inventados
  const [preferences, setPreferences] = useState(() => ({
    theme: (user?.preferences?.theme as 'light' | 'dark') || theme,
    currency: user?.preferences?.currency || 'PEN',
    notifications: {
      email: user?.preferences?.notifications?.email ?? true,
      push: user?.preferences?.notifications?.push ?? true,
    },
  }))
  const [savingPrefs, setSavingPrefs] = useState(false)

  // Exportación
  const [exporting, setExporting] = useState<null | 'csv' | 'json'>(null)

  // Eliminación de cuenta (modal con contraseña)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [showDeletePassword, setShowDeletePassword] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSaveProfile = async () => {
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      toast.error('Nombre y apellido no pueden quedar vacíos')
      return
    }
    setSavingProfile(true)
    try {
      const data = await updateProfile({
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
      })
      updateUser(data.user)
      toast.success('Perfil actualizado')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'No se pudo actualizar el perfil')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSavePreferences = async () => {
    setSavingPrefs(true)
    try {
      await updatePreferences(preferences)
      setTheme(preferences.theme)
      updateUser({ ...user, preferences: { ...user?.preferences, ...preferences } })
      toast.success('Preferencias guardadas')
    } catch (error) {
      toast.error(error?.message || 'Error al guardar preferencias')
    } finally {
      setSavingPrefs(false)
    }
  }

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(format)
    toast.loading('Preparando tu exportación…', { id: 'export' })
    try {
      const transactions = await fetchAllTransactions()
      if (transactions.length === 0) {
        toast.error('Aún no tienes movimientos para exportar', { id: 'export' })
        return
      }
      const stamp = new Date().toISOString().slice(0, 10)
      if (format === 'json') {
        const payload = {
          exportadoEl: new Date().toISOString(),
          usuario: { nombre: user?.firstName, apellido: user?.lastName, email: user?.email },
          totalMovimientos: transactions.length,
          movimientos: transactions,
        }
        downloadFile(JSON.stringify(payload, null, 2), `kipu-datos-${stamp}.json`, 'application/json')
      } else {
        const headers = ['fecha', 'descripcion', 'comercio', 'categoria', 'tipo', 'moneda', 'monto', 'origen', 'nro_operacion']
        const rows = transactions.map((t) => [
          t.date ? new Date(t.date).toISOString().slice(0, 10) : '',
          t.description, t.merchant, t.category, t.type, t.currency, t.amount, t.origin, t.operationNumber,
        ].map(csvEscape).join(','))
        // BOM para que Excel abra el CSV con acentos correctos
        downloadFile(['﻿' + headers.join(','), ...rows].join('\n'), `kipu-movimientos-${stamp}.csv`, 'text/csv;charset=utf-8')
      }
      toast.success(`${transactions.length} movimientos exportados`, { id: 'export' })
    } catch (err) {
      console.error('Error exportando:', err)
      toast.error('La exportación falló. Inténtalo de nuevo.', { id: 'export' })
    } finally {
      setExporting(null)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await deleteAccount(deletePassword || undefined)
      toast.success('Tu cuenta y todos tus datos fueron eliminados')
      logout()
    } catch (err) {
      const code = err?.response?.data?.error
      if (code === 'password_requerida') toast.error('Confirma con tu contraseña')
      else if (code === 'password_incorrecta') toast.error('La contraseña no es correcta')
      else toast.error('No se pudo eliminar la cuenta')
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" subtitle="Personaliza tu experiencia en Kipu" />

      {/* Perfil (editable de verdad) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <User className="w-5 h-5 text-primary dark:text-primary-300" />
          </div>
          <h2 className="text-lg font-serif italic text-main">Perfil de Usuario</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="micro-label block mb-2">Nombre</label>
            <input
              type="text"
              value={profile.firstName}
              onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
              className="input-field"
              maxLength={60}
            />
          </div>
          <div>
            <label className="micro-label block mb-2">Apellido</label>
            <input
              type="text"
              value={profile.lastName}
              onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
              className="input-field"
              maxLength={60}
            />
          </div>
          <div className="md:col-span-2">
            <label className="micro-label block mb-2">Correo electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              <input type="email" value={user?.email || ''} className="input-field input-field--with-prefix-icon" disabled />
            </div>
            <p className="mt-1.5 text-xs text-muted">El correo identifica tu cuenta y no puede cambiarse.</p>
          </div>
        </div>

        <AnimatePresence>
          {profileDirty && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <div className="mt-5 pt-4 border-t border-subtle flex gap-2.5">
                <button onClick={handleSaveProfile} disabled={savingProfile} className="btn-primary">
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> : null}
                  Guardar perfil
                </button>
                <button
                  onClick={() => setProfile({ firstName: user?.firstName || '', lastName: user?.lastName || '' })}
                  className="btn-secondary"
                >
                  Descartar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Preferencias */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="w-5 h-5 text-primary dark:text-primary-300" />
          </div>
          <h2 className="text-lg font-serif italic text-main">Preferencias de la App</h2>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              {preferences.theme === 'dark' ? <Moon className="w-5 h-5 text-muted" /> : <Sun className="w-5 h-5 text-muted" />}
              <div>
                <h4 className="text-sm font-semibold text-main">Tema de la aplicación</h4>
                <p className="text-xs text-muted">Claro u oscuro</p>
              </div>
            </div>
            <select
              value={preferences.theme}
              onChange={(e) => setPreferences({ ...preferences, theme: e.target.value as 'light' | 'dark' })}
              className="input-field !w-36"
            >
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-main">Moneda</h4>
              <p className="text-xs text-muted">Moneda principal para mostrar montos</p>
            </div>
            <select
              value={preferences.currency}
              onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
              className="input-field !w-36"
            >
              <option value="PEN">PEN (S/)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-main mb-3">Notificaciones</h4>
            <div className="space-y-3">
              {[
                { key: 'email', icon: Mail, label: 'Notificaciones por correo' },
                { key: 'push', icon: Bell, label: 'Notificaciones push' },
              ].map(({ key, icon: Icon, label }) => (
                <label key={key} className="flex items-center justify-between cursor-pointer">
                  <span className="flex items-center space-x-3">
                    <Icon className="w-4 h-4 text-muted" />
                    <span className="text-sm text-main/80">{label}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.notifications[key]}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        notifications: { ...preferences.notifications, [key]: e.target.checked },
                      })
                    }
                    className="rounded text-primary focus:ring-primary/40"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-subtle">
            <button onClick={handleSavePreferences} disabled={savingPrefs} className="btn-primary">
              {savingPrefs ? <><Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Guardando…</> : 'Guardar preferencias'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Reglas de clasificación (motor determinístico) */}
      <RulesManager />

      {/* Bandeja de revisión: correos BCP no procesables */}
      <EmailReviewTray />

      {/* Credenciales de PDF guardadas (cifradas) */}
      <SavedPdfCredentials />

      {/* Datos y privacidad */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-sage-600/10 rounded-lg">
            <Shield className="w-5 h-5 text-sage-600 dark:text-sage-300" />
          </div>
          <h2 className="text-lg font-serif italic text-main">Datos y Privacidad</h2>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-base/60 rounded-2xl border border-subtle">
            <div className="flex items-center space-x-3">
              <Download className="w-5 h-5 text-primary dark:text-primary-300 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-main">Exportar mis datos</h4>
                <p className="text-xs text-muted">Descarga todos tus movimientos al instante</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleExport('csv')} disabled={exporting !== null} className="btn-secondary !py-2.5">
                {exporting === 'csv' ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> : <FileSpreadsheet className="w-4 h-4" />}
                CSV
              </button>
              <button onClick={() => handleExport('json')} disabled={exporting !== null} className="btn-secondary !py-2.5">
                {exporting === 'json' ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> : <FileJson className="w-4 h-4" />}
                JSON
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
            <div className="flex items-center space-x-3">
              <Trash2 className="w-5 h-5 text-rose-500 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-main">Eliminar cuenta</h4>
                <p className="text-xs text-muted">Borra permanentemente tu cuenta y todos tus datos del servidor</p>
              </div>
            </div>
            <button
              onClick={() => { setDeletePassword(''); setDeleteOpen(true) }}
              className="min-h-[44px] px-5 bg-rose-600 text-white text-xs font-bold uppercase tracking-wide rounded-full hover:bg-rose-700 active:scale-95 transition"
            >
              Eliminar
            </button>
          </div>
        </div>
      </motion.div>

      {/* Modal de eliminación: confirmación con contraseña */}
      <AnimatePresence>
        {deleteOpen && (
          <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !deleting && setDeleteOpen(false)}
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
              <button onClick={() => setDeleteOpen(false)} className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:bg-base transition">
                <X className="w-4 h-4" />
              </button>
              <div className="h-11 w-11 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                <Trash2 className="w-5 h-5" strokeWidth={2.25} />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-main">¿Eliminar tu cuenta?</h2>
              <p className="mt-1.5 text-sm text-muted">
                Se borrarán permanentemente tu cuenta, movimientos, reglas y credenciales.
                Esta acción no se puede deshacer.
              </p>

              <label className="micro-label block mt-5 mb-2">Confirma con tu contraseña</label>
              <div className="relative">
                <input
                  type={showDeletePassword ? 'text' : 'password'}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && deletePassword && handleDeleteAccount()}
                  autoFocus
                  className="input-field input-field--with-suffix-icon"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowDeletePassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-lg text-muted hover:text-primary hover:bg-primary/10 transition"
                  aria-label={showDeletePassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                onClick={handleDeleteAccount}
                disabled={deleting || !deletePassword}
                className="w-full mt-5 min-h-[44px] px-5 bg-rose-600 text-white text-sm font-bold uppercase tracking-wide rounded-full hover:bg-rose-700 disabled:opacity-40 transition inline-flex items-center justify-center gap-2"
              >
                {deleting ? <><Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Eliminando…</> : 'Eliminar definitivamente'}
              </button>
              <button onClick={() => setDeleteOpen(false)} disabled={deleting} className="btn-secondary w-full mt-2.5">
                Conservar mi cuenta
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Settings
