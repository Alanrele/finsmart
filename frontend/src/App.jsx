/*
  Proyecto: Kipu
  Autor: Alan Reyes Leandro
  Correo: alanreyesleandro5@gmail.com
  Derechos: © 2025 Alan Reyes Leandro – Todos los derechos reservados.
  Descripción: Componente principal de la aplicación con rutas y autenticación
*/

import React, { useEffect, useMemo, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useMsal } from '@azure/msal-react'
import toast from 'react-hot-toast'
import useAuthStore from './stores/authStore'
import socketService from './services/socket'


// Layout
import Layout from './components/layout/Layout'

// Páginas
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Analysis from './pages/Analysis'
import ChatIA from './pages/ChatIA'
import OutlookConnect from './pages/OutlookConnect'
import Settings from './pages/Settings'
import EnhancedAIAssistant from './pages/EnhancedAIAssistant'
import FinancialTools from './pages/FinancialTools'
import WelcomeScreen from './pages/WelcomeScreen'

// Auth y comunes
import AuthCallback from './components/auth/AuthCallback'
import LoadingScreen from './components/common/LoadingScreen'
import ConnectivityStatus from './components/common/ConnectivityStatus'
import SSLErrorNotification from './components/common/SSLErrorNotification'
import useAppStore from './stores/appStore'

// Paneles de debug
import DebugAuth from './components/debug/DebugAuth'
import DebugMSAL from './components/debug/DebugMSAL'
import AuthDebugPanel from './components/debug/AuthDebugPanel'
import AuthStorageDebug from './components/debug/AuthStorageDebug'
import EmailParserTester from './components/debug/EmailParserTester'
import SocketDebugPanel from './components/debug/SocketDebugPanel'

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const user = useAuthStore(state => state.user)
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Dar un pequeño margen para rehidratar Zustand en recargas
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
          <p className="mt-2 text-muted">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const { isAuthenticated, user, token, login, updateLastActivity, clearExpiredSession } = useAuthStore()
  const { initializeTheme, addNotification } = useAppStore()
  const { instance } = useMsal()
  const navigate = useNavigate()
  const location = useLocation()
  const appReady = useAppStore(state => state.appReady)
  const [debugEnabled, setDebugEnabled] = useState(() => {
    // Build-time flag (Vite)
    const envFlag = String(import.meta.env.VITE_ENABLE_DEBUG || '').toLowerCase() === 'true'
    // Persisted flag (localStorage)
    const lsFlag = typeof window !== 'undefined' && window.localStorage.getItem('finsmart:debug') === '1'
    // URL query flag
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const urlFlag = urlParams ? ['1', 'true', 'on'].includes(String(urlParams.get('debug')).toLowerCase()) : false
    if (urlFlag && typeof window !== 'undefined') {
      window.localStorage.setItem('finsmart:debug', '1')
    }
    return envFlag || lsFlag || urlFlag
  })

  // Allow toggling debug via URL param and keyboard shortcut Ctrl+Alt+D
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const qp = params.get('debug')
    if (qp != null) {
      const on = ['1', 'true', 'on'].includes(qp.toLowerCase())
      window.localStorage.setItem('finsmart:debug', on ? '1' : '0')
      setDebugEnabled(on)
      // Optional: clean the param from URL without reload
      try {
        params.delete('debug')
        const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`
        window.history.replaceState({}, '', newUrl)
      } catch {}
    }

    const onKey = (e) => {
      // Ctrl + Alt + D to toggle
      if (e.ctrlKey && e.altKey && (e.key === 'd' || e.key === 'D')) {
        setDebugEnabled(prev => {
          const next = !prev
          window.localStorage.setItem('finsmart:debug', next ? '1' : '0')
          return next
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Activity tracker effect para mantener la sesión activa
  useEffect(() => {
    const trackActivity = () => {
      if (isAuthenticated) {
        updateLastActivity();
      }
    };

    // Eventos que indican actividad del usuario
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      document.addEventListener(event, trackActivity, true);
    });

    // Verificar sesión cada 5 minutos
    const sessionCheck = setInterval(() => {
      if (isAuthenticated && clearExpiredSession()) {
        console.log('🔐 Sesión expirada, redirigiendo al login');
        navigate('/login', { replace: true });
      }
    }, 5 * 60 * 1000); // 5 minutos

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, trackActivity, true);
      });
      clearInterval(sessionCheck);
    };
  }, [isAuthenticated, updateLastActivity, clearExpiredSession, navigate]);

  // MSAL redirect is handled exclusively in AuthCallback component now to avoid races

  useEffect(() => {
    // Initialize theme
    initializeTheme()

    // Connect socket if authenticated
    if (isAuthenticated && user && token) {
      socketService.connect(user._id, token)

      // Listen for real-time notifications
      const handleNotification = (notification) => {
        addNotification(notification)
      }

      // Listen for new transactions
      const handleNewTransaction = (transaction) => {
        addNotification({
          type: 'success',
          title: 'Nueva Transacción',
          message: `Nueva transacción detectada: ${transaction.description}`,
          priority: 'medium'
        })
      }

      socketService.on('notification', handleNotification)
      socketService.on('new-transaction', handleNewTransaction)

      // Cleanup on unmount - properly remove listeners and disconnect
      return () => {
        socketService.off('notification', handleNotification)
        socketService.off('new-transaction', handleNewTransaction)
        socketService.disconnect()
      }
    }
  }, [isAuthenticated, user, token, initializeTheme, addNotification])

  return (
    <div className="App min-h-screen bg-base text-main">

      {/* Debug panels - only render when debug mode enabled */}
      {debugEnabled && <DebugAuth />}
      {debugEnabled && <DebugMSAL />}

      {/* Main content */}
      <div>
      <Routes>
        {/* Kipu Upgrade: Ruta raíz con pantalla de bienvenida */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <WelcomeScreen onAuthenticated={() => navigate('/dashboard')} />
            )
          }
        />

        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login />
            )
          }
        />

        <Route
          path="/auth/ms-callback"
          element={<AuthCallback />}
        />

        {/* Kipu Upgrade: Rutas protegidas */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
        </Route>

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="analysis" element={<Analysis />} />
          <Route path="chat" element={<ChatIA />} />
          <Route path="ai-assistant" element={<EnhancedAIAssistant />} />
          <Route path="tools" element={<FinancialTools />} />
          <Route path="outlook" element={<OutlookConnect />} />
          <Route path="settings" element={<Settings />} />
          {debugEnabled && <Route path="email-parser" element={<EmailParserTester />} />}
        </Route>

        <Route path="*" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        } />
      </Routes>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          },
          success: {
            iconTheme: {
              primary: 'var(--color-sage)',
              secondary: 'var(--color-surface)',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: 'var(--color-surface)',
            },
          },
        }}
      />

      {/* Debug Panel - solo en desarrollo */}
      {process.env.NODE_ENV === 'development' && <AuthDebugPanel />}

  {/* Connectivity Status - solo si app lista y modo debug */}
  {debugEnabled && appReady && <ConnectivityStatus />}

      {/* SSL Error Notification - detecta automáticamente problemas de certificado */}
      <SSLErrorNotification />

  {/* Auth Storage Debug - oculto por defecto */}
  {debugEnabled && <AuthStorageDebug />}

      {/* Socket Debug Panel - oculto por defecto */}
      {debugEnabled && <SocketDebugPanel />}
      </div>
    </div>
  )
}

export default App
