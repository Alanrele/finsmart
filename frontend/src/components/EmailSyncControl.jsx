import React, { useState, useEffect } from 'react'
import { getSyncStatus, toggleSync as apiToggleSync, syncEmails } from '../services/api'
import useAuthStore from '../stores/authStore'
import toast from 'react-hot-toast'

const EmailSyncControl = () => {
  const [syncStatus, setSyncStatus] = useState({
    syncEnabled: false,
    lastSync: null,
    hasConnection: false,
    recentTransactions: 0,
    isDemo: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isToggling, setIsToggling] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const { isAuthenticated } = useAuthStore()

  // Load sync status on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadSyncStatus()
    }
  }, [isAuthenticated])

  const loadSyncStatus = async () => {
    try {
      setIsLoading(true)
      const response = await getSyncStatus()
      setSyncStatus({
        syncEnabled: !!response?.syncEnabled,
        lastSync: response?.lastSync || null,
        hasConnection: !!response?.hasConnection,
        recentTransactions: response?.recentTransactions ?? 0,
        isDemo: !!response?.isDemo,
        message: response?.message
      })
    } catch (error) {
      console.error('Error loading sync status:', error)
      toast.error('Error al cargar estado de sincronización')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleSync = async () => {
    try {
      setIsToggling(true)
      const newState = !syncStatus.syncEnabled

      const response = await apiToggleSync(newState)

      setSyncStatus(prev => ({
        ...prev,
        syncEnabled: newState,
        lastSync: response?.lastSync || prev.lastSync || new Date().toISOString()
      }))

      toast.success(
        newState
          ? '✅ Sincronización automática activada'
          : '⏸️ Sincronización automática desactivada'
      )
    } catch (error) {
      console.error('Error toggling sync:', error)
      toast.error('Error al cambiar sincronización')
    } finally {
      setIsToggling(false)
    }
  }

  const manualSync = async () => {
    try {
      setIsSyncing(true)
      toast.loading('📧 Sincronizando correos...', { id: 'sync' })

      const response = await syncEmails()

      toast.success(
        `✅ Sincronización completada: ${response.processedCount} transacciones procesadas`,
        { id: 'sync' }
      )

      // Reload status after sync
      await loadSyncStatus()
    } catch (error) {
      console.error('Error during manual sync:', error)
      toast.error('Error en la sincronización', { id: 'sync' })
    } finally {
      setIsSyncing(false)
    }
  }

  const formatLastSync = (lastSync) => {
    if (!lastSync) return 'Nunca'

    const date = new Date(lastSync)
    if (isNaN(date.getTime())) return 'Nunca'
    const now = new Date()
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))

    if (diffInMinutes < 1) return 'Hace unos segundos'
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} minutos`
    if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)} horas`
    return `Hace ${Math.floor(diffInMinutes / 1440)} días`
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          📧 Sincronización de Correos BCP
        </h3>
        {syncStatus.syncEnabled && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></span>
            Activa
          </span>
        )}
      </div>

      {syncStatus.isDemo ? (
        <div className="text-center py-8">
          <div className="text-yellow-500 text-4xl mb-4">⚠️</div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {syncStatus.message}
          </p>
          <p className="text-sm text-gray-500">
            Conecta tu cuenta real de Microsoft para activar la sincronización automática
          </p>
        </div>
      ) : !syncStatus.hasConnection ? (
        <div className="text-center py-8">
          <div className="text-red-500 text-4xl mb-4">🔗</div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No hay conexión con Microsoft Graph
          </p>
          <p className="text-sm text-gray-500">
            Conecta tu cuenta de Microsoft primero
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Estado:</span>
              <span className={`ml-2 font-medium ${
                syncStatus.syncEnabled
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {syncStatus.syncEnabled ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Última sync:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {formatLastSync(syncStatus.lastSync)}
              </span>
            </div>
          </div>

          {syncStatus.recentTransactions > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="flex items-center">
                <div className="text-blue-500 text-lg mr-2">💳</div>
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {syncStatus.recentTransactions} transacciones detectadas en los últimos 7 días
                </span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex space-x-3">
            <button
              onClick={handleToggleSync}
              disabled={isToggling}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                syncStatus.syncEnabled
                  ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
                  : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isToggling ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Cambiando...
                </span>
              ) : syncStatus.syncEnabled ? (
                '⏸️ Desactivar Sync'
              ) : (
                '▶️ Activar Sync'
              )}
            </button>

            <button
              onClick={manualSync}
              disabled={isSyncing}
              className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                  Sincronizando...
                </span>
              ) : (
                '🔄 Sincronizar Ahora'
              )}
            </button>
          </div>

          {/* Description */}
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded p-3">
            <p className="mb-1">
              <strong>Sincronización automática:</strong> Revisa nuevos correos de BCP cada 15 minutos
            </p>
            <p>
              <strong>Sincronización manual:</strong> Revisa todos los correos de BCP inmediatamente
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmailSyncControl
