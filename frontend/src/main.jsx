import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MsalProvider } from '@azure/msal-react'
import { PublicClientApplication } from '@azure/msal-browser'
import { msalConfig } from './config/msalConfig'
import App from './App.jsx'
import useAppStore from './stores/appStore'
import MSALInitializing from './components/MSALInitializing.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Global error handlers for browser extension interference
window.addEventListener('unhandledrejection', (event) => {
  // Handle browser extension message channel errors
  if (event.reason && typeof event.reason === 'string') {
    if (event.reason.includes('message channel closed') ||
        event.reason.includes('listener indicated an asynchronous response') ||
        event.reason.includes('Extension context invalidated')) {
      console.warn('🚫 Browser extension error caught and prevented:', event.reason)
      event.preventDefault() // Prevent the error from propagating
      return
    }
  }

  // Log other unhandled promise rejections for debugging
  console.error('🚨 Unhandled promise rejection:', event.reason)
})

window.addEventListener('error', (event) => {
  // Handle browser extension script errors
  if (event.message && (
    event.message.includes('message channel closed') ||
    event.message.includes('listener indicated an asynchronous response') ||
    event.message.includes('Extension context invalidated')
  )) {
    console.warn('🚫 Browser extension error caught and prevented:', event.message)
    event.preventDefault() // Prevent the error from propagating
    return false
  }

  // Log other errors for debugging
  console.error('🚨 Global error:', event.error)
})

const msalInstance = new PublicClientApplication(msalConfig);

const Root = () => {
  const [msalInitialized, setMsalInitialized] = useState(false)
  const [msalError, setMsalError] = useState(false)
  const setAppReady = useAppStore(state => state.setAppReady)

  useEffect(() => {
    // Ensure service worker updates apply immediately to avoid mixed-version UIs
    try {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          updateSW(true)
        },
        onOfflineReady() { /* noop */ }
      })
    } catch (e) {
      // ignore if PWA plugin not active in this build
    }

    const initializeMsal = async () => {
      try {
        await msalInstance.initialize()
        setMsalInitialized(true)
      } catch (error) {
        console.error('MSAL initialization failed:', error)
        setMsalError(true)
        setMsalInitialized(true) // Still render the app
      }
    }

    initializeMsal()
  }, [])

  if (!msalInitialized) {
    return <MSALInitializing />
  }

  if (msalError) {
    // Render app without MSAL if initialization failed
    return (
      <React.StrictMode>
        <ErrorBoundary>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <App />
          </BrowserRouter>
        </ErrorBoundary>
      </React.StrictMode>
    )
  }

  return (
    <React.StrictMode>
      <ErrorBoundary>
        <MsalProvider instance={msalInstance}>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <App />
          </BrowserRouter>
        </MsalProvider>
      </ErrorBoundary>
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />)
