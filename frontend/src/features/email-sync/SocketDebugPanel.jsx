import React, { useState, useEffect } from 'react'
import socketService from '@shared/io/socket'
import useAuthStore from '@entities/session/model/authStore'

const SocketDebugPanel = () => {
  const [socketStatus, setSocketStatus] = useState('unknown')
  const [transportType, setTransportType] = useState('unknown')
  const [connectionLogs, setConnectionLogs] = useState([])
  const [isVisible, setIsVisible] = useState(false)
  const { isAuthenticated, user, token } = useAuthStore()

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setConnectionLogs(prev => [...prev.slice(-10), { timestamp, message, type }])
  }

  useEffect(() => {
    const checkSocketStatus = () => {
      if (socketService.socket) {
        setSocketStatus(socketService.socket.connected ? 'connected' : 'disconnected')
        if (socketService.socket.io?.engine?.transport) {
          setTransportType(socketService.socket.io.engine.transport.name)
        }
      } else {
        setSocketStatus('not-initialized')
        setTransportType('none')
      }
    }

    // Check every second
    const interval = setInterval(checkSocketStatus, 1000)

    // Listen to socket events if available
    if (socketService.socket) {
      const onConnect = () => {
        addLog('✅ Socket connected', 'success')
        checkSocketStatus()
      }

      const onDisconnect = (reason) => {
        addLog(`❌ Socket disconnected: ${reason}`, 'error')
        checkSocketStatus()
      }

      const onConnectError = (error) => {
        addLog(`🔌 Connection error: ${error.message}`, 'error')
        checkSocketStatus()
      }

      socketService.socket.on('connect', onConnect)
      socketService.socket.on('disconnect', onDisconnect)
      socketService.socket.on('connect_error', onConnectError)

      return () => {
        clearInterval(interval)
        if (socketService.socket) {
          socketService.socket.off('connect', onConnect)
          socketService.socket.off('disconnect', onDisconnect)
          socketService.socket.off('connect_error', onConnectError)
        }
      }
    }

    return () => clearInterval(interval)
  }, [])

  const reconnectSocket = () => {
    if (isAuthenticated && user && token) {
      addLog('🔄 Manual reconnection attempt', 'info')
      socketService.disconnect()
      setTimeout(() => {
        socketService.connect(user._id, token)
      }, 1000)
    }
  }

  const forcePollingMode = () => {
    if (socketService.socket) {
      addLog('🚀 Forcing polling mode', 'info')
      socketService.socket.io.opts.transports = ['polling']
      socketService.socket.io.opts.upgrade = false
      socketService.socket.disconnect()
      setTimeout(() => socketService.socket.connect(), 500)
    }
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-full shadow-lg text-sm"
        >
          Socket Debug
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Socket.io Debug</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        {/* Status */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
          <span className={`text-sm font-medium ${
            socketStatus === 'connected' ? 'text-green-600' :
            socketStatus === 'disconnected' ? 'text-red-600' :
            'text-yellow-600'
          }`}>
            {socketStatus}
          </span>
        </div>

        {/* Transport */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Transport:</span>
          <span className="text-sm font-medium text-blue-600">{transportType}</span>
        </div>

        {/* Auth Status */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Auth:</span>
          <span className={`text-sm font-medium ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
            {isAuthenticated ? 'Yes' : 'No'}
          </span>
        </div>

        {/* Controls */}
        <div className="flex space-x-2">
          <button
            onClick={reconnectSocket}
            className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
            disabled={!isAuthenticated}
          >
            Reconnect
          </button>
          <button
            onClick={forcePollingMode}
            className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs"
          >
            Force Polling
          </button>
        </div>

        {/* Logs */}
        <div className="border-t pt-2">
          <div className="text-xs text-gray-500 mb-1">Connection Logs:</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {connectionLogs.length === 0 ? (
              <div className="text-xs text-gray-400">No logs yet...</div>
            ) : (
              connectionLogs.map((log, index) => (
                <div key={index} className={`text-xs ${
                  log.type === 'success' ? 'text-green-600' :
                  log.type === 'error' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  <span className="text-gray-400">{log.timestamp}</span> {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SocketDebugPanel
