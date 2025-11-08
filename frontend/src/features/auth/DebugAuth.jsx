import React from 'react'
import useAuthStore from '@entities/session/model/authStore'

const DebugAuth = () => {
  const { user, token, isAuthenticated, logout } = useAuthStore()

  if (process.env.NODE_ENV === 'production') {
    return null
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4>🐛 Debug Auth State</h4>
      <p><strong>isAuthenticated:</strong> {isAuthenticated ? '✅' : '❌'}</p>
      <p><strong>User:</strong> {user ? user.email || user.firstName : 'null'}</p>
      <p><strong>Token:</strong> {token ? '✅ Present' : '❌ None'}</p>
      <button
        onClick={logout}
        style={{
          background: 'red',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          cursor: 'pointer',
          marginTop: '5px'
        }}
      >
        Logout
      </button>
      <br />
      <small>Current path: {window.location.pathname}</small>
    </div>
  )
}

export default DebugAuth
