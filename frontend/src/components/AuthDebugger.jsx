import React, { useState, useEffect } from 'react';
import useAuthStore from '../stores/authStore';
import { demoLogin } from '../services/api';
import toast from 'react-hot-toast';

const AuthDebugger = () => {
  const [authData, setAuthData] = useState(null);
  const [apiTest, setApiTest] = useState(null);
  const authStore = useAuthStore();

  useEffect(() => {
    // Get auth data from localStorage
    const storageData = localStorage.getItem('auth-storage');
    if (storageData) {
      try {
        setAuthData(JSON.parse(storageData));
      } catch (error) {
        console.error('Error parsing auth data:', error);
      }
    }

    // Test API connection
    testApiConnection();
  }, []);

  const testApiConnection = async () => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      setApiTest({
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });
    } catch (error) {
      setApiTest({
        error: error.message,
        status: 'Network Error'
      });
    }
  };

  const enableDemoMode = async () => {
    const allowDemo = import.meta.env.VITE_ALLOW_DEMO_MODE === 'true';
    const isProd = import.meta.env.MODE === 'production';
    if (!allowDemo || isProd) {
      toast.error('Demo mode is disabled');
      return;
    }
    try {
      const data = await demoLogin();

      if (data) {
        authStore.login(data.user, data.token);
        toast.success('Modo demo activado exitosamente');

        // Refresh the page to apply new auth state
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Demo mode activation failed:', error);
      toast.error('Error al activar modo demo: ' + (error.response?.data?.error || error.message));
    }
  };

  const clearAuth = () => {
    authStore.logout();
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      background: '#fff',
      border: '2px solid #ccc',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      zIndex: 9999,
      maxWidth: '300px',
      fontSize: '12px'
    }}>
      <h4>🔧 Auth Debugger</h4>

      <div style={{ marginBottom: '10px' }}>
        <strong>Auth Store:</strong>
        <br />
        • Authenticated: {authStore.isAuthenticated ? '✅' : '❌'}
        <br />
        • Has Token: {authStore.token ? '✅' : '❌'}
        <br />
        • User: {authStore.user?.email || 'None'}
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>LocalStorage:</strong>
        <br />
        • Has auth-storage: {authData ? '✅' : '❌'}
        <br />
        • Structure: {authData?.state ? 'Zustand' : authData?.token ? 'Direct' : 'None'}
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>API Test:</strong>
        <br />
        • Status: {apiTest?.status || 'Testing...'}
        <br />
        • OK: {apiTest?.ok ? '✅' : '❌'}
        <br />
        • Error: {apiTest?.error || 'None'}
      </div>

      <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
        {import.meta.env.VITE_ALLOW_DEMO_MODE === 'true' && import.meta.env.MODE !== 'production' && (
        <button
          onClick={enableDemoMode}
          style={{
            padding: '5px 10px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Enable Demo Mode
        </button>
        )}

        <button
          onClick={clearAuth}
          style={{
            padding: '5px 10px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Auth
        </button>

        <button
          onClick={testApiConnection}
          style={{
            padding: '5px 10px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test API
        </button>
      </div>
    </div>
  );
};

export default AuthDebugger;
