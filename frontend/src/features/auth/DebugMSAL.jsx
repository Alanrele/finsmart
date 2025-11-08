import React from 'react'
import { useMsal } from '@azure/msal-react'
import useAuthStore from '@entities/session/model/authStore'

const DebugMSAL = () => {
  const { instance, accounts, inProgress } = useMsal()
  const { isAuthenticated, user } = useAuthStore()

  if (!import.meta.env.DEV) return null // Solo en desarrollo

  const handleTestRedirect = async () => {
    try {
      console.log('Testing redirect manually...')
      const response = await instance.handleRedirectPromise()
      console.log('Manual redirect response:', response)
    } catch (error) {
      console.error('Manual redirect error:', error)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#000',
      color: '#fff',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      maxWidth: '300px',
      zIndex: 9999
    }}>
      <h4>🔍 MSAL Debug Info</h4>
      <div><strong>Environment Variables:</strong></div>
      <div>CLIENT_ID: {import.meta.env.VITE_GRAPH_CLIENT_ID || 'MISSING'}</div>
      <div>TENANT_ID: {import.meta.env.VITE_GRAPH_TENANT_ID || 'MISSING'}</div>
      <div>API_URL: {import.meta.env.VITE_API_URL || 'MISSING'}</div>
      <hr />
      <div><strong>MSAL State:</strong></div>
      <div>Accounts: {accounts.length}</div>
      <div>InProgress: {inProgress}</div>
      <div>SessionStorage Login: {sessionStorage.getItem('msalLoginInProgress') || 'none'}</div>
      <hr />
      <div><strong>Auth Store:</strong></div>
      <div>Authenticated: {isAuthenticated ? 'YES' : 'NO'}</div>
      <div>User: {user?.email || 'none'}</div>
      <hr />
      <button
        onClick={handleTestRedirect}
        style={{
          background: '#007ACC',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '3px',
          cursor: 'pointer'
        }}
      >
        Test Redirect
      </button>
    </div>
  )
}

export default DebugMSAL
