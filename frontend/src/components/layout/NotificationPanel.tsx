import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import useAppStore from '../../stores/appStore'

const NotificationPanel = () => {
  const { notifications, removeNotification, clearNotifications } = useAppStore()
  const [isOpen, setIsOpen] = useState(false)

  // Auto-close notifications after 5 seconds
  useEffect(() => {
    notifications.forEach(notification => {
      if (notification.autoClose !== false && notification.id != null) {
        setTimeout(() => {
          removeNotification(notification.id!)
        }, 5000)
      }
    })
  }, [notifications, removeNotification])

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      default:
        return <Info className="w-5 h-5 text-primary-500" />
    }
  }

  const getBackgroundColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      default:
        return 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
    }
  }

  return (
    <>
      {/* Notification Bell (Mobile) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 lg:hidden bg-card p-3 rounded-full shadow-lg border border-subtle z-40 safe-area-bottom"
      >
        <Bell className="w-5 h-5 text-main/80" />
        {notifications && notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      {/* Desktop Notifications */}
      <div className="hidden lg:block fixed top-4 right-4 z-50 space-y-3 w-96">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 300, scale: 0.3 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.5 }}
              transition={{ duration: 0.3 }}
              className={`p-4 rounded-lg shadow-lg border ${getBackgroundColor(notification.type)}`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-main">
                    {notification.title}
                  </h4>
                  <p className="text-sm text-main/80 mt-1">
                    {notification.message}
                  </p>
                  {notification.timestamp && (
                    <p className="text-xs text-muted mt-2">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => notification.id != null && removeNotification(notification.id)}
                  className="flex-shrink-0 text-muted hover:text-muted dark:hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Mobile Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 right-0 w-full max-w-sm h-full bg-card z-50 lg:hidden overflow-y-auto"
            >
              <div className="p-4 border-b border-subtle">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-serif italic text-main">
                    Notificaciones
                  </h2>
                  <div className="flex items-center space-x-2">
                    {notifications && notifications.length > 0 && (
                      <button
                        onClick={clearNotifications}
                        className="text-sm text-muted hover:text-main/80 dark:hover:text-zinc-300"
                      >
                        Limpiar todo
                      </button>
                    )}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-muted hover:text-muted dark:hover:text-zinc-200"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4">
                {!notifications || notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="w-12 h-12 text-muted/40 mx-auto mb-4" />
                    <p className="text-muted">
                      No tienes notificaciones
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-lg border ${getBackgroundColor(notification.type)}`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            {getIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-main">
                              {notification.title}
                            </h4>
                            <p className="text-sm text-main/80 mt-1">
                              {notification.message}
                            </p>
                            {notification.timestamp && (
                              <p className="text-xs text-muted mt-2">
                                {new Date(notification.timestamp).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => notification.id != null && removeNotification(notification.id)}
                            className="flex-shrink-0 text-muted hover:text-muted dark:hover:text-zinc-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default NotificationPanel
