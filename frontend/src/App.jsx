import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
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

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const msalAuthenticated = useIsAuthenticated();
  const { accounts } = useMsal();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const user = useAuthStore(state => state.user)
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🛡️ ProtectedRoute verificando estado:', {
      msalAuthenticated,
      zustandAuthenticated: isAuthenticated,
      hasUser: !!user,
      accountsCount: accounts.length,
      timestamp: new Date().toISOString()
    });

    // Dar tiempo para que MSAL se inicialice completamente
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [msalAuthenticated, isAuthenticated, user, accounts]);

  // Mostrar loading mientras se verifica el estado
  if (isLoading) {
    console.log('🛡️ ProtectedRoute: Verificando autenticación...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Verificar tanto MSAL como Zustand y que tenga cuentas
  if (!msalAuthenticated || !isAuthenticated || accounts.length === 0) {
    console.log('🛡️ ProtectedRoute: Usuario no autenticado, redirigiendo a login');
    return <Navigate to="/login" replace />;
  }

  console.log('🛡️ ProtectedRoute: Usuario autenticado, mostrando contenido protegido');
  return children;
};

function App() {
  const { isAuthenticated, user, token, login, updateLastActivity, clearExpiredSession } = useAuthStore()
  const { initializeTheme, addNotification } = useAppStore()
  const { instance, inProgress, accounts } = useMsal()
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

  useEffect(() => {
    // Handle Microsoft login callback
    const handleCallback = async () => {
      try {
        console.log('🔍 Callback handler - inProgress:', inProgress, 'accounts:', accounts.length)
        
        // Wait for MSAL to initialize and ensure no other operations are in progress
        if (instance && inProgress === "none") {
          console.log('🚀 Handling redirect promise...')
          const response = await instance.handleRedirectPromise()

          if (response && response.account) {
            console.log('✅ Microsoft login success:', response.account.username)

            // Success - user is authenticated
            const userInfo = {
              _id: response.account.localAccountId,
              firstName: response.account.idTokenClaims?.given_name || 'Usuario',
              lastName: response.account.idTokenClaims?.family_name || 'Microsoft',
              email: response.account.username,
              avatar: null
            }

            // Create a demo token for development
            const token = `demo-token-${Date.now()}`

            // Ensure login is processed
            console.log('🔐 Setting auth state:', userInfo)
            login(userInfo, token)
            
            // Wait a bit for state to update
            setTimeout(() => {
              console.log('🎯 Auth state after login:', { isAuthenticated, user: useAuthStore.getState().user })
              toast.success('✅ Autenticación exitosa con Microsoft')
              
              // Clear any login progress flags
              sessionStorage.removeItem('msalLoginInProgress')

              // Navigate to dashboard
              console.log('🚀 Navigating to dashboard...')
              navigate('/dashboard', { replace: true })
            }, 100)
            
          } else if (sessionStorage.getItem('msalLoginInProgress') === 'true') {
            // Login was in progress but no response received
            console.log('⚠️ Login was in progress but no response received')
            sessionStorage.removeItem('msalLoginInProgress')
          } else {
            console.log('ℹ️ No redirect response, normal page load')
          }
        } else {
          console.log('⏳ MSAL not ready or operation in progress:', inProgress)
        }
      } catch (error) {
        console.error('❌ Auth callback error:', error)
        sessionStorage.removeItem('msalLoginInProgress')

        // Only show error if it's a real error, not just normal flow
        if (error.name !== 'InteractionInProgress') {
          toast.error('Error en la autenticación con Microsoft')
        }
      }
    }

    // Only run if MSAL instance is available
    if (instance) {
      handleCallback()
    }
  }, [instance, login, navigate, inProgress])

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
    </div>
  )
}

export default App
