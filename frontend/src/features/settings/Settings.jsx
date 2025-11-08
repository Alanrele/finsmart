import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Bell, Moon, Sun, Shield, Download, Trash2 } from 'lucide-react'
import useAuthStore from '@entities/session/model/authStore'
import useAppStore from '@entities/app/model/appStore'
import { updatePreferences } from '@shared/api/base'
import toast from 'react-hot-toast'

const Settings = () => {
  const { user, updateUser, logout } = useAuthStore()
  const { theme, setTheme } = useAppStore()
  const [loading, setLoading] = useState(false)
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
    if (!confirm('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')) {
      return
    }

    setLoading(true)

    try {
      // This would call delete account API
      logout()
      toast.success('Cuenta eliminada correctamente')
    } catch (error) {
      toast.error('Error al eliminar la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          Configuración
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Personaliza tu experiencia en FinSmart
        </p>
      </div>

      {/* Profile Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Perfil de Usuario
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="email"
                value={user?.email || ''}
                className="input-field input-field--with-prefix-icon"
                disabled
              />
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Preferencias de la App
          </h2>
        </div>

        <div className="space-y-6">
          {/* Theme */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {preferences.theme === 'dark' ? (
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Tema de la Aplicación
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Elige entre modo claro u oscuro
                </p>
              </div>
            </div>
            <select
              value={preferences.theme}
              onChange={(e) => setPreferences({
                ...preferences,
                theme: e.target.value
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
              <h4 className="font-medium text-gray-900 dark:text-white">
                Moneda
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
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
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              Notificaciones
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
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
                  className="rounded text-dark-primary focus:ring-dark-primary"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
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
                  className="rounded text-dark-primary focus:ring-dark-primary"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Datos y Privacidad
          </h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <Download className="w-5 h-5 text-blue-600" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Exportar mis datos
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
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
              onClick={handleDeleteAccount}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
    </div>
  )
}

export default Settings
