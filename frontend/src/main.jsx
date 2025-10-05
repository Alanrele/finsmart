import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MsalProvider } from '@azure/msal-react'
import { PublicClientApplication } from '@azure/msal-browser'
import { msalConfig } from './config/msalConfig'
import App from './App.jsx'
import MSALInitializing from './components/MSALInitializing.jsx'
import './index.css'

const msalInstance = new PublicClientApplication(msalConfig);

const Root = () => {
  const [msalInitialized, setMsalInitialized] = useState(false)
  const [msalError, setMsalError] = useState(false)

  useEffect(() => {
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
        <BrowserRouter 
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <App />
        </BrowserRouter>
      </React.StrictMode>
    )
  }

  return (
    <React.StrictMode>
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
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />)
