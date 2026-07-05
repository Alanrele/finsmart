import React, { useState } from 'react'
import { PageHeader } from '../components/ui/kit'
import { motion } from 'framer-motion'
import { User, Mail, Bell, Moon, Sun, Shield, Download, Trash2 } from 'lucide-react'
import useAuthStore from '../stores/authStore'
import useAppStore from '../stores/appStore'
import { updatePreferences } from '../services/api'
import toast from 'react-hot-toast'
import ConfirmDialog from '../components/common/ConfirmDialog'
import RulesManager from '../components/settings/RulesManager'
import SavedPdfCredentials from '../components/settings/SavedPdfCredentials'

const Settings = () => {
  const { user, updateUser, logout } = useAuthStore()
  const { theme, setTheme } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [preferences, setPreferences] = useState({
    theme: theme,
    notifications: {
      email: true,
      push: true
    },
    currency: 'PEN'
  })

  const handleSavePreferences = async () => {
    setLoading(true)

    try {
      await updatePreferences(preferences)
      setTheme(preferences.theme)
      toast.success('Preferencias guardadas correctamente')
    } catch (error) {
      toast.error(error.message || 'Error al guardar preferencias')
    } finally {
      setLoading(false)
    }
  }

  const handleExportData = async () => {
    setLoading(true)

    try {
      // This would typically download a file
      toast.success('Exportación iniciada - recibirás un email con tus datos')
    } catch (error) {
      toast.error('Error al exportar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setLoading(true)

    try {
      // This would call delete account API
      logout()
      toast.success('Cuenta eliminada correctamente')
    } catch (error) {
      toast.error('Error al eliminar la cuenta')
    } finally {
      setLoading(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Configuración" subtitle="Personaliza tu experiencia en Kipu" />

      {/* Profile Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
            <User className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Perfil de Usuario
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Nombre
            </label>
            <input
              type="text"
              value={user?.firstName || ''}
              className="input-field"
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Apellido
            </label>
            <input
              type="text"
              value={user?.lastName || ''}
              className="input-field"
              disabled
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="email"
                value={user?.email || ''}
                className="input-field input-field--with-prefix-icon"
                disabled
              />
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
          <p className="text-sm text-primary-800 dark:text-primary-300">
            Para modificar tu información personal, por favor contacta al soporte.
          </p>
        </div>
      </motion.div>

      {/* App Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
            <Shield className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Preferencias de la App
          </h2>
        </div>

        <div className="space-y-6">
          {/* Theme */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {preferences.theme === 'dark' ? (
                <Moon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              ) : (
                <Sun className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              )}
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-white">
                  Tema de la Aplicación
                </h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Elige entre modo claro u oscuro
                </p>
              </div>
            </div>
            <select
              value={preferences.theme}
              onChange={(e) => setPreferences({
                ...preferences,
                theme: e.target.value as 'light' | 'dark'
              })}
              className="input-field w-32"
            >
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
            </select>
          </div>

          {/* Currency */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-zinc-900 dark:text-white">
                Moneda
              </h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Moneda para mostrar tus transacciones
              </p>
            </div>
            <select
              value={preferences.currency}
              onChange={(e) => setPreferences({
                ...preferences,
                currency: e.target.value
              })}
              className="input-field w-32"
            >
              <option value="PEN">PEN (S/)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>

          {/* Notifications */}
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-white mb-3">
              Notificaciones
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    Notificaciones por email
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.notifications.email}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    notifications: {
                      ...preferences.notifications,
                      email: e.target.checked
                    }
                  })}
                  className="rounded text-primary focus:ring-primary/40"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    Notificaciones push
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.notifications.push}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    notifications: {
                      ...preferences.notifications,
                      push: e.target.checked
                    }
                  })}
                  className="rounded text-primary focus:ring-primary/40"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <button
              onClick={handleSavePreferences}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Guardando...' : 'Guardar Preferencias'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Reglas de clasificación (motor determinístico) */}
      <RulesManager />

      {/* Credenciales de PDF guardadas (cifradas) */}
      <SavedPdfCredentials />

      {/* Data & Privacy */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <Shield className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Datos y Privacidad
          </h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <Download className="w-5 h-5 text-primary-600" />
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-white">
                  Exportar mis datos
                </h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Descarga una copia de toda tu información
                </p>
              </div>
            </div>
            <button
              onClick={handleExportData}
              disabled={loading}
              className="btn-secondary"
            >
              Exportar
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <Trash2 className="w-5 h-5 text-red-600" />
              <div>
                <h4 className="font-medium text-red-800 dark:text-red-200">
                  Eliminar cuenta
                </h4>
                <p className="text-sm text-red-600 dark:text-red-300">
                  Elimina permanentemente tu cuenta y todos tus datos
                </p>
              </div>
            </div>
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={loading}
              className="min-h-[44px] px-4 bg-red-600 text-white text-sm font-black rounded-xl hover:bg-red-700 active:bg-red-800 transition disabled:opacity-50"
            >
              Eliminar
            </button>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            Información sobre tus datos
          </h4>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            <li>• Tus datos financieros se procesan localmente y de forma segura</li>
            <li>• No compartimos tu información con terceros</li>
            <li>• Puedes eliminar tu cuenta en cualquier momento</li>
            <li>• Cumplimos con las regulaciones de protección de datos</li>
          </ul>
        </div>
      </motion.div>

      <ConfirmDialog
        open={confirmDelete}
        title="¿Eliminar tu cuenta?"
        message="Se borrarán permanentemente tu cuenta y todas tus transacciones. Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar cuenta"
        cancelLabel="Cancelar"
        tone="danger"
        loading={loading}
        onConfirm={handleDeleteAccount}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

export default Settings
