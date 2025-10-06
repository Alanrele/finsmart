import React, { useState, useEffect } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import useAuthStore from '../stores/authStore';

const AuthDebugPanel = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [logs, setLogs] = useState([]);

  const msalAuthenticated = useIsAuthenticated();
  const { accounts } = useMsal();
  const authStore = useAuthStore();

  const addLog = (message) => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [...prev.slice(-10), { timestamp, message }]); // Keep last 10 logs
  };

  useEffect(() => {
    addLog(`MSAL Auth: ${msalAuthenticated}, Zustand Auth: ${authStore.isAuthenticated}, Accounts: ${accounts.length}`);
  }, [msalAuthenticated, authStore.isAuthenticated, accounts.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (authStore.isAuthenticated) {
        const isValid = authStore.isSessionValid();
        if (!isValid) {
          addLog('⚠️ Sesión expirada detectada');
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [authStore]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded-full shadow-lg z-50"
        style={{ fontSize: '12px' }}
      >
        🐛 Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border shadow-lg rounded-lg p-4 max-w-md z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-sm">Auth Debug Panel</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <strong>MSAL Auth:</strong>
            <span className={msalAuthenticated ? 'text-green-600' : 'text-red-600'}>
              {msalAuthenticated ? ' ✅' : ' ❌'}
            </span>
          </div>
          <div>
            <strong>Zustand Auth:</strong>
            <span className={authStore.isAuthenticated ? 'text-green-600' : 'text-red-600'}>
              {authStore.isAuthenticated ? ' ✅' : ' ❌'}
            </span>
          </div>
          <div>
            <strong>Accounts:</strong> {accounts.length}
          </div>
          <div>
            <strong>User:</strong> {authStore.user?.firstName || 'None'}
          </div>
        </div>

        {authStore.lastActivity && (
          <div>
            <strong>Last Activity:</strong> {new Date(authStore.lastActivity).toLocaleTimeString()}
          </div>
        )}

        <div>
          <strong>Session Valid:</strong>
          <span className={authStore.isSessionValid() ? 'text-green-600' : 'text-red-600'}>
            {authStore.isSessionValid() ? ' ✅' : ' ❌'}
          </span>
        </div>

        <div className="border-t pt-2">
          <strong>Recent Logs:</strong>
          <div className="max-h-32 overflow-y-auto">
            {logs.slice(-5).map((log, index) => (
              <div key={index} className="text-xs text-gray-600">
                <span className="text-gray-400">{log.timestamp.split('T')[1].split('.')[0]}</span>
                {' - '}
                {log.message}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <button
            onClick={() => authStore.logout()}
            className="bg-red-500 text-white px-2 py-1 rounded text-xs"
          >
            Force Logout
          </button>
          <button
            onClick={() => authStore.updateLastActivity()}
            className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
          >
            Update Activity
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthDebugPanel;
