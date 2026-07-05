import { io, Socket } from 'socket.io-client'

type Listener = (data: unknown) => void

class SocketService {
  // público: el panel de debug lee el socket directamente
  socket: Socket | null = null
  private listeners: Map<string, Listener[]> = new Map()
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null

  connect(userId: string, token: string): Socket | null {
    // Basic token sanitation
    if (typeof token === 'string' && token.startsWith('Bearer ')) {
      token = token.replace(/^Bearer\s+/i, '')
    }

    const hasThreeParts = typeof token === 'string' && token.split('.').length === 3
    if (!token || !hasThreeParts) {
      console.warn('🚫 Socket.IO: token malformado o ausente; no se iniciará la conexión de sockets')
      return null
    }
    // Opción para deshabilitar Socket.io en producción si es necesario
    if (import.meta.env.VITE_DISABLE_SOCKET === 'true') {
      console.log('🚫 Socket.io disabled via environment variable')
      return null
    }

    if (this.socket?.connected) {
      this.disconnect()
    }

    // Configurar URL del servidor Socket.IO
    const getSocketUrl = (): string => {
      const { hostname, origin } = window.location
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
      if (isLocal) {
        console.log('🏠 Development Socket - Using localhost')
        return 'http://localhost:5000'
      }
      console.log('🚀 Production Socket - Using window.origin')
      return origin
    }

    const serverUrl = getSocketUrl()

    console.log('🔌 Socket.IO connecting to:', serverUrl)
    console.log('🌐 Current hostname:', window.location.hostname)

    // Configuración específica para Railway (limita WebSockets en plan gratuito)
    const isRailwayProduction = !serverUrl.includes('localhost')
    const transportConfig = isRailwayProduction
      ? ['polling']
      : ['websocket', 'polling']

    this.socket = io(serverUrl, {
      path: '/api/socket.io',
      auth: {
        token,
        userId,
      },
      transports: transportConfig,
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      upgrade: false,
      rememberUpgrade: false,
      withCredentials: true,
      autoConnect: true,
      forceBase64: isRailwayProduction,
      query: {
        transport: isRailwayProduction ? 'polling' : 'websocket',
      },
    } as Record<string, unknown>)

    this.socket.on('connect', () => {
      console.log('✅ Connected to socket server via', this.socket?.io.engine.transport.name)
      console.log('🏠 Joining user room:', userId)
      this.socket?.emit('join-user-room', userId)
    })

    this.socket.on('disconnect', (reason: string) => {
      console.log('❌ Disconnected from socket server:', reason)

      if (isRailwayProduction && reason === 'transport close') {
        console.log('🔄 Railway transport closed, attempting reconnection...')
        setTimeout(() => {
          if (!this.socket?.connected) {
            this.socket?.connect()
          }
        }, 2000)
      }
    })

    this.socket.on('connect_error', (error: Error) => {
      console.error('🔌 Socket connection error:', error.message)

      if (isRailwayProduction) {
        console.log('🚀 Railway connection issue - ensuring polling mode')
        if (this.socket) {
          this.socket.io.opts.transports = ['polling']
          this.socket.io.opts.upgrade = false
        }
      } else if (error.message.includes('websocket')) {
        console.log('🔄 WebSocket failed, falling back to polling...')
        if (this.socket) this.socket.io.opts.transports = ['polling']
      }
    })

    this.socket.on('reconnect_failed', () => {
      console.error('🚫 Socket reconnection failed completely')
      if (isRailwayProduction) {
        console.log('🔄 Attempting manual reconnection with polling...')
        setTimeout(() => {
          if (this.socket) {
            this.socket.io.opts.transports = ['polling']
            this.socket.connect()
          }
        }, 5000)
      }
    })

    // Heartbeat para mantener la conexión viva en Railway
    this.socket.on('connect', () => {
      if (isRailwayProduction) {
        this.heartbeatInterval = setInterval(() => {
          if (this.socket?.connected) {
            this.socket.emit('ping')
          }
        }, 25000)
      }
    })

    this.socket.on('disconnect', () => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval)
        this.heartbeatInterval = null
      }
    })

    this.setupDefaultListeners()

    return this.socket
  }

  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.listeners.clear()
  }

  setupDefaultListeners(): void {
    if (!this.socket) return

    this.socket.on('new-transaction', (transaction: unknown) => {
      console.log('New transaction received:', transaction)
      this.emit('new-transaction', transaction)
    })

    this.socket.on('sync-completed', (data: unknown) => {
      console.log('Sync completed:', data)
      this.emit('sync-completed', data)
    })

    this.socket.on('reprocess-completed', (data: unknown) => {
      console.log('Reprocess completed:', data)
      this.emit('reprocess-completed', data)
    })

    this.socket.on('analysis-completed', (analysis: unknown) => {
      console.log('AI analysis completed:', analysis)
      this.emit('analysis-completed', analysis)
    })

    this.socket.on('notification', (notification: unknown) => {
      console.log('New notification:', notification)
      this.emit('notification', notification)
    })
  }

  // Event listener management
  on(event: string, callback: Listener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  off(event: string, callback: Listener): void {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)!
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit(event: string, data: unknown): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((callback) => {
        try {
          callback(data)
        } catch (error) {
          console.error('Error in socket event callback:', error)
        }
      })
    }
  }

  send(event: string, data: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    } else {
      console.warn('Socket not connected, cannot send message:', event)
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }
}

const socketService = new SocketService()

export default socketService
