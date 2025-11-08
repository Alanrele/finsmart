import React, { useState, useEffect } from 'react';
import { Eye, Copy, RefreshCw } from 'lucide-react';

const AuthStorageDebug = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [authData, setAuthData] = useState(null);
  const [rawData, setRawData] = useState('');

  const refreshData = () => {
    const storage = localStorage.getItem('auth-storage');
    setRawData(storage || 'No data found');

    if (storage) {
      try {
        const parsed = JSON.parse(storage);
        setAuthData(parsed);
      } catch (error) {
        setAuthData({ error: 'Failed to parse JSON', raw: storage });
      }
    } else {
      setAuthData(null);
    }
  };

  useEffect(() => {
    if (isVisible) {
      refreshData();
    }
  }, [isVisible]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-20 right-4 bg-purple-500 text-white p-2 rounded-full shadow-lg z-50 text-xs"
        title="Debug Auth Storage"
      >
        🔍
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border shadow-xl rounded-lg p-4 max-w-lg z-50 max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4" />
          <h3 className="font-bold text-sm">Auth Storage Debug</h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={refreshData}
            className="text-blue-500 hover:text-blue-700"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="space-y-3 text-xs">
        <div>
          <div className="flex items-center justify-between mb-1">
            <strong>Raw Storage Data:</strong>
            <button
              onClick={() => copyToClipboard(rawData)}
              className="text-blue-500 hover:text-blue-700"
              title="Copy"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto max-h-20">
            {rawData}
          </pre>
        </div>

        {authData && (
          <div>
            <strong>Parsed Data:</strong>
            <div className="bg-gray-50 p-2 rounded mt-1 space-y-1">
              {authData.error ? (
                <div className="text-red-600">
                  Error: {authData.error}
                </div>
              ) : (
                <>
                  <div><strong>Version:</strong> {authData.version || 'N/A'}</div>
                  {authData.state && (
                    <div className="border-l-2 border-blue-300 pl-2">
                      <div><strong>User:</strong> {authData.state.user?.firstName || 'N/A'} {authData.state.user?.lastName || ''}</div>
                      <div><strong>Email:</strong> {authData.state.user?.email || 'N/A'}</div>
                      <div><strong>Is Authenticated:</strong> {authData.state.isAuthenticated ? '✅' : '❌'}</div>
                      <div><strong>Has Token:</strong> {authData.state.token ? '✅' : '❌'}</div>
                      {authData.state.token && (
                        <div>
                          <strong>Token Preview:</strong> {authData.state.token.substring(0, 20)}...
                          <button
                            onClick={() => copyToClipboard(authData.state.token)}
                            className="ml-1 text-blue-500 hover:text-blue-700"
                            title="Copy Token"
                          >
                            <Copy className="w-3 h-3 inline" />
                          </button>
                        </div>
                      )}
                      <div><strong>Last Activity:</strong> {authData.state.lastActivity ? new Date(authData.state.lastActivity).toLocaleString() : 'N/A'}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <div className="border-t pt-2">
          <strong>Actions:</strong>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => {
                localStorage.removeItem('auth-storage');
                refreshData();
              }}
              className="bg-red-500 text-white px-2 py-1 rounded text-xs"
            >
              Clear Storage
            </button>
            <button
              onClick={() => {
                console.log('Auth Storage Debug:', { rawData, authData });
              }}
              className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
            >
              Log to Console
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthStorageDebug;
