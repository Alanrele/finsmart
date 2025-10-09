import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Mail,
  Calendar,
  Download,
  Trash2
} from 'lucide-react'
import { useMicrosoftAuth } from '../hooks/useMicrosoftAuth'
import {
  connectGraph,
  getGraphStatus,
  disconnectGraph,
  syncEmails,
  reprocessEmails,
  resetAndReprocessEmails
} from '../services/api'
import socketService from '../services/socket'
import useAppStore from '../stores/appStore'
import toast from 'react-hot-toast'

const OutlookConnect = () => {
  const { getAccessToken } = useMicrosoftAuth()
  const { isGraphConnected, setGraphConnection, lastSync } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [reprocessLoading, setReprocessLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(null)

  useEffect(() => {
    checkConnectionStatus()
  }, [])

  // Handle reprocess completion
  useEffect(() => {
    const handleReprocessCompleted = (data) => {
      toast.success(
        `Reprocesamiento completado: ${data.updated} actualizadas, ${data.errors} errores, ${data.skipped} omitidas`
      )
      setReprocessLoading(false)
    }

    socketService.on('reprocess-completed', handleReprocessCompleted)

    return () => {
      socketService.off('reprocess-completed', handleReprocessCompleted)
    }
  }, [])

  const checkConnectionStatus = async () => {
    try {
      const data = await getGraphStatus()
      setConnectionStatus(data)
      setGraphConnection(data.isConnected, data.lastSync)
    } catch (error) {
      console.error('Error checking connection status:', error)
    }
  }

  const handleConnect = async () => {
    setLoading(true)

    try {
      // Get access token from Microsoft
      const accessToken = await getAccessToken()

      // Send token to backend
      await connectGraph({ accessToken, refreshToken: null })

      setGraphConnection(true, new Date())
      toast.success('Outlook conectado exitosamente')
      await checkConnectionStatus()

    } catch (error) {
      toast.error(error.message || 'Error al conectar Outlook')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setLoading(true)

    try {
      await disconnectGraph()
      setGraphConnection(false, null)
      setConnectionStatus(null)
      toast.success('Outlook desconectado')

    } catch (error) {
      toast.error(error.message || 'Error al desconectar')
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    if (!isGraphConnected) {
      toast.error('Primero debes conectar tu cuenta de Outlook')
      return
    }

    setSyncLoading(true)

    try {
      const data = await syncEmails()

      toast.success(
        `Sincronización completada: ${data.processedCount} nuevas transacciones procesadas`
      )

      setGraphConnection(true, new Date())
      await checkConnectionStatus()

    } catch (error) {
      toast.error(error.message || 'Error al sincronizar')
    } finally {
      setSyncLoading(false)
    }
  }

  const handleReprocess = async () => {
    if (!isGraphConnected) {
      toast.error('Primero debes conectar tu cuenta de Outlook')
      return
    }

    setReprocessLoading(true)

    try {
      await reprocessEmails()

      toast.success(
        'Reprocesamiento iniciado. Recibirás una notificación cuando termine.'
      )

      // The actual completion will be handled via WebSocket

    } catch (error) {
      toast.error(error.message || 'Error al reprocesar')
    } finally {
      setReprocessLoading(false)
    }
  }

  const handleResetAndReprocess = async () => {
    if (!isGraphConnected) {
      toast.error('Primero debes conectar tu cuenta de Outlook')
      return
    }

    // Confirmar acción destructiva
    const confirmed = window.confirm('Esto eliminará todas las transacciones importadas por correo y volverá a procesar tu historial. ¿Deseas continuar?')
    if (!confirmed) return

    setResetLoading(true)

    try {
      const data = await resetAndReprocessEmails()
      toast.success(`Se eliminaron ${data.deletedCount} transacciones. Reprocesamiento iniciado.`)
    } catch (error) {
      toast.error(error.message || 'Error al reiniciar y reprocesar')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          Conexión con Outlook
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Conecta tu cuenta de Microsoft Outlook para analizar correos del BCP
        </p>
      </div>

      {/* Connection Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Estado de Conexión
          </h2>
          <div className="flex items-center space-x-2">
            {isGraphConnected ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span className={`text-sm font-medium ${
              isGraphConnected ? 'text-green-500' : 'text-red-500'
            }`}>
              {isGraphConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Mail className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Microsoft Graph
              </span>
            </div>
            <p className={`text-lg font-bold ${
              isGraphConnected ? 'text-green-600' : 'text-gray-500'
            }`}>
              {isGraphConnected ? 'Activo' : 'Inactivo'}
            </p>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Última Sincronización
              </span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {lastSync
                ? new Date(lastSync).toLocaleDateString()
                : 'Nunca'
              }
            </p>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Download className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Transacciones
              </span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {connectionStatus?.processedCount || 0}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {!isGraphConnected ? (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="btn-primary flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="loading-spinner w-4 h-4" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              <span>Conectar Outlook</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleSync}
                disabled={syncLoading}
                className="btn-primary flex items-center justify-center space-x-2"
              >
                {syncLoading ? (
                  <div className="loading-spinner w-4 h-4" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>Sincronizar Correos</span>
              </button>

              <button
                onClick={handleReprocess}
                disabled={reprocessLoading}
                className="btn-outline flex items-center justify-center space-x-2"
              >
                {reprocessLoading ? (
                  <div className="loading-spinner w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span>Reprocesar Correos</span>
              </button>

              <button
                onClick={handleResetAndReprocess}
                disabled={resetLoading}
                className="btn-secondary flex items-center justify-center space-x-2"
                aria-label="Limpiar y Reprocesar"
                title="Elimina transacciones importadas y vuelve a procesar el historial"
                data-testid="reset-and-reprocess"
              >
                {resetLoading ? (
                  <div className="loading-spinner w-4 h-4" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Limpiar y Reprocesar</span>
              </button>

              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="btn-secondary flex items-center justify-center space-x-2"
              >
                <XCircle className="w-4 h-4" />
                <span>Desconectar</span>
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* Instructions Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Cómo Funciona
        </h3>

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">1</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                Conecta tu cuenta de Microsoft
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Autoriza a FinSmart para acceder a tus correos de Outlook de forma segura
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">2</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                Sincronización automática
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                FinSmart lee los correos del BCP y extrae automáticamente la información de transacciones
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">3</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                Análisis inteligente
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                La IA analiza tus gastos y genera recomendaciones personalizadas
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Reprocessing Info */}
      {isGraphConnected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-start space-x-3">
            <RefreshCw className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200">
                Reprocesamiento de Correos
              </h4>
              <div className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                <p>• Mejora la precisión de las transacciones ya procesadas</p>
                <p>• Aplica algoritmos mejorados de extracción de datos</p>
                <p>• Corrige errores de clasificación anteriores</p>
                <p>• Procesa todos los correos históricos de una vez</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Security Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
      >
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
              Información de Seguridad
            </h4>
            <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
              <p>• Solo leemos correos del remitente "notificaciones@bcp.com.pe"</p>
              <p>• No almacenamos el contenido completo de tus correos</p>
              <p>• Puedes desconectar en cualquier momento</p>
              <p>• Utilizamos Microsoft Graph API con autenticación OAuth 2.0</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default OutlookConnect
