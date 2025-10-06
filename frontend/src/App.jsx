import React, { useEffect } from 'react'
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

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  const { isAuthenticated, user, token, login } = useAuthStore()
  const { initializeTheme, addNotification } = useAppStore()
  const { instance, inProgress } = useMsal()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Handle Microsoft login callback
    const handleCallback = async () => {
      try {
        // Wait for MSAL to initialize and ensure no other operations are in progress
        if (instance && inProgress === "none") {
          const response = await instance.handleRedirectPromise()

          if (response && response.account) {
            console.log('Microsoft login success:', response.account.username)
            
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

            login(userInfo, token)
            toast.success('Autenticación exitosa con Microsoft')
            
            // Clear any login progress flags
            sessionStorage.removeItem('msalLoginInProgress')
            
            // Navigate to dashboard
            navigate('/dashboard')
          } else if (sessionStorage.getItem('msalLoginInProgress') === 'true') {
            // Login was in progress but no response received
            console.log('Login was in progress but no response received')
            sessionStorage.removeItem('msalLoginInProgress')
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error)
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
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
          }
        />

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
    </div>
  )
}

export default App
