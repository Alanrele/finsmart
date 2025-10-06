import React, { useState, useEffect } from 'react';
import { AlertTriangle, Wifi, WifiOff, Server, XCircle } from 'lucide-react';

const ConnectivityStatus = () => {
  const [backendStatus, setBackendStatus] = useState('checking'); // checking, online, offline
  const [socketStatus, setSocketStatus] = useState('disconnected'); // connected, disconnected, error
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Verificar estado del backend
    const checkBackend = async () => {
      try {
        const baseUrl = window.location.hostname.includes('railway.app') 
          ? `${window.location.protocol}//${window.location.hostname}`
          : 'http://localhost:5000';
        
        const response = await fetch(`${baseUrl}/health`, {
          method: 'GET',
          timeout: 5000
        });
        
        setBackendStatus(response.ok ? 'online' : 'offline');
      } catch (error) {
        console.warn('Backend check failed:', error);
        setBackendStatus('offline');
      }
    };

    // Verificar estado del socket
    const checkSocket = () => {
      // Intentar detectar errores de WebSocket desde los logs del navegador
      const hasWebSocketErrors = window.console && 
        window.console.memory && 
        JSON.stringify(window.console).includes('WebSocket');
      
      if (hasWebSocketErrors) {
        setSocketStatus('error');
      }
    };

    checkBackend();
    checkSocket();

    // Verificar cada 30 segundos
    const interval = setInterval(() => {
      checkBackend();
      checkSocket();
    }, 30000);

    // Mostrar si hay problemas
    const showIfProblems = setTimeout(() => {
      if (backendStatus === 'offline' || socketStatus === 'error') {
        setIsVisible(true);
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(showIfProblems);
    };
  }, [backendStatus, socketStatus]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
      case 'connected':
        return 'text-green-600';
      case 'offline':
      case 'error':
        return 'text-red-600';
      case 'checking':
      default:
        return 'text-yellow-600';
    }
  };

  const getStatusIcon = (service, status) => {
    if (service === 'backend') {
      return status === 'online' ? <Server className="w-4 h-4" /> : <XCircle className="w-4 h-4" />;
    } else {
      return status === 'connected' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />;
    }
  };

  // Solo mostrar si hay problemas o si el usuario lo solicitó
  if (!isVisible && backendStatus === 'online' && socketStatus === 'connected') {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-4 right-4 bg-blue-500 text-white p-2 rounded-full shadow-lg z-50 text-xs"
        title="Ver estado de conectividad"
      >
        📡
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-white border shadow-lg rounded-lg p-4 max-w-sm z-50">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h3 className="font-bold text-sm">Estado de Conectividad</h3>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon('backend', backendStatus)}
            <span>Backend API</span>
          </div>
          <span className={`font-semibold ${getStatusColor(backendStatus)}`}>
            {backendStatus === 'online' && '✅ Online'}
            {backendStatus === 'offline' && '❌ Offline'}
            {backendStatus === 'checking' && '🔄 Verificando...'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon('socket', socketStatus)}
            <span>WebSocket</span>
          </div>
          <span className={`font-semibold ${getStatusColor(socketStatus)}`}>
            {socketStatus === 'connected' && '✅ Conectado'}
            {socketStatus === 'error' && '❌ Error SSL'}
            {socketStatus === 'disconnected' && '🔄 Desconectado'}
          </span>
        </div>

        {(backendStatus === 'offline' || socketStatus === 'error') && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-3">
            <p className="text-xs text-yellow-800">
              <strong>Problema detectado:</strong><br />
              {backendStatus === 'offline' && 'El servidor backend no responde. '}
              {socketStatus === 'error' && 'Error de certificado SSL en WebSocket. '}
              Las funcionalidades pueden estar limitadas.
            </p>
            
            <div className="mt-2 text-xs text-yellow-700">
              <strong>Posibles soluciones:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Verificar que el backend esté desplegado en Railway</li>
                <li>Comprobar la configuración SSL del servidor</li>
                <li>Intentar recargar la página</li>
              </ul>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 mt-2">
          Última verificación: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default ConnectivityStatus;