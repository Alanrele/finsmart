import { io } from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
    this.listeners = new Map()
  }

  connect(userId, token) {
    if (this.socket?.connected) {
      this.disconnect()
    }

    // Configurar URL del servidor Socket.IO
    const getSocketUrl = () => {
      // Forzar Railway en cualquier dominio que no sea localhost
      const hostname = window.location.hostname
      const isProduction = hostname.includes('railway.app') || hostname !== 'localhost'

      if (isProduction) {
        console.log('🚀 Production Socket - Using Railway URL')
        return 'https://finsmart-production.up.railway.app'
      }

      console.log('🏠 Development Socket - Using localhost')
      return 'http://localhost:5000'
    }

    const serverUrl = getSocketUrl()

    console.log('🔌 Socket.IO connecting to:', serverUrl)
    console.log('🌐 Current hostname:', window.location.hostname)

    this.socket = io(serverUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      // Configuración para manejar problemas de conexión
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 3,
      maxReconnectionAttempts: 3,
      // Configuración específica para Railway
      upgrade: true,
      rememberUpgrade: false
    })

    this.socket.on('connect', () => {
      console.log('✅ Connected to socket server')
      this.socket.emit('join-user-room', userId)
    })

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from socket server:', reason)
    })

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error.message)
      // Si falla WebSocket, intentar con polling solamente
      if (error.message.includes('websocket')) {
        console.log('🔄 Retrying with polling transport only...')
        this.socket.io.opts.transports = ['polling']
      }
    })

    this.socket.on('reconnect_failed', () => {
      console.error('🚫 Socket reconnection failed completely')
    })

    // Set up default listeners
    this.setupDefaultListeners()

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.listeners.clear()
  }

  setupDefaultListeners() {
    if (!this.socket) return

    // New transaction received
    this.socket.on('new-transaction', (transaction) => {
      console.log('New transaction received:', transaction)
      this.emit('new-transaction', transaction)
    })

    // Sync completed
    this.socket.on('sync-completed', (data) => {
      console.log('Sync completed:', data)
      this.emit('sync-completed', data)
    })

    // AI analysis completed
    this.socket.on('analysis-completed', (analysis) => {
      console.log('AI analysis completed:', analysis)
      this.emit('analysis-completed', analysis)
    })

    // Real-time notifications
    this.socket.on('notification', (notification) => {
      console.log('New notification:', notification)
      this.emit('notification', notification)
    })
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Error in socket event callback:', error)
        }
      })
    }
  }

  // Send message to server
  send(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    } else {
      console.warn('Socket not connected, cannot send message:', event)
    }
  }

  isConnected() {
    return this.socket?.connected || false
  }
}

// Create singleton instance
const socketService = new SocketService()

export default socketService
