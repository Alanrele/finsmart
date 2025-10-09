import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useMsal } from '@azure/msal-react'
import toast from 'react-hot-toast'
import useAuthStore from './stores/authStore'
import useAppStore from './stores/appStore'
import socketService from './services/socket'


// Components
import Layout from './components/Layout'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Transactions from './components/Transactions'
import Analysis from './components/Analysis'
import ChatIA from './components/ChatIA'
import OutlookConnect from './components/OutlookConnect'
import Settings from './components/Settings'
import LoadingScreen from './components/LoadingScreen'
import AuthCallback from './components/AuthCallback'
import DebugAuth from './components/DebugAuth'
import DebugMSAL from './components/DebugMSAL'
import AuthDebugPanel from './components/AuthDebugPanel'
import ConnectivityStatus from './components/ConnectivityStatus'
import SSLErrorNotification from './components/SSLErrorNotification'

import AuthStorageDebug from './components/AuthStorageDebug'
import EmailParserTester from './components/EmailParserTester'
import SocketDebugPanel from './components/SocketDebugPanel'

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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Verificando autenticación...</p>
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
      socketService.on('notification', (notification) => {
        addNotification(notification)
      })

      // Listen for new transactions
      socketService.on('new-transaction', (transaction) => {
        addNotification({
          type: 'success',
          title: 'Nueva Transacción',
          message: `Nueva transacción detectada: ${transaction.description}`,
          priority: 'medium'
        })
      })

      // Cleanup on unmount
      return () => {
        socketService.disconnect()
      }
    }
  }, [isAuthenticated, user, token, initializeTheme, addNotification])

  return (
    <div className="App min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">


      <DebugAuth />
      <DebugMSAL />

      {/* Main content */}
      <div>
      <Routes>
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

        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

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
          <Route path="outlook" element={<OutlookConnect />} />
          <Route path="settings" element={<Settings />} />
          <Route path="email-parser" element={<EmailParserTester />} />
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
            background: 'var(--color-fondo)',
            color: 'var(--color-texto)',
            border: '1px solid var(--color-principal)',
          },
          success: {
            iconTheme: {
              primary: 'var(--color-detalle)',
              secondary: 'var(--color-fondo)',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: 'var(--color-fondo)',
            },
          },
        }}
      />

      {/* Debug Panel - solo en desarrollo */}
      {process.env.NODE_ENV === 'development' && <AuthDebugPanel />}

      {/* Connectivity Status */}
      <ConnectivityStatus />

      {/* SSL Error Notification - detecta automáticamente problemas de certificado */}
      <SSLErrorNotification />

      {/* Auth Storage Debug - para diagnosticar problemas de tokens */}
      <AuthStorageDebug />

      {/* Socket Debug Panel - monitorea conexiones en tiempo real */}
      <SocketDebugPanel />
      </div>
    </div>
  )
}

export default App
