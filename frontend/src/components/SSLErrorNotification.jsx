import React, { useState, useEffect } from 'react';
import { AlertTriangle, Wifi, WifiOff, Shield, RefreshCw } from 'lucide-react';

const SSLErrorNotification = () => {
  const [sslErrors, setSSLErrors] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [lastError, setLastError] = useState(null);

  useEffect(() => {
    // Interceptar errores de red para detectar problemas SSL
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      try {
        return await originalFetch(...args);
      } catch (error) {
        if (error.message.includes('CERT') || 
            error.message.includes('SSL') || 
            error.message.includes('TLS') ||
            error.name === 'TypeError' && args[0]?.includes('railway.app')) {
          
          setSSLErrors(prev => prev + 1);
          setLastError(new Date());
          setIsVisible(true);
        }
        throw error;
      }
    };

    // Interceptar errores de consola para WebSocket SSL
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('WebSocket') && message.includes('failed') && message.includes('railway.app')) {
        setSSLErrors(prev => prev + 1);
        setLastError(new Date());
        setIsVisible(true);
      }
      originalConsoleError(...args);
    };

    // Auto-ocultar después de 30 segundos si no hay más errores
    const autoHideTimer = setInterval(() => {
      if (lastError && (Date.now() - lastError.getTime()) > 30000) {
        setIsVisible(false);
      }
    }, 5000);

    return () => {
      window.fetch = originalFetch;
      console.error = originalConsoleError;
      clearInterval(autoHideTimer);
    };
  }, [lastError]);

  const reloadPage = () => {
    window.location.reload();
  };

  const tryAlternativeUrl = () => {
    // Intentar acceder directamente al health endpoint
    const newTab = window.open('https://finsmart-production.up.railway.app/health', '_blank');
    setTimeout(() => {
      if (newTab) {
        newTab.close();
        window.location.reload();
      }
    }, 3000);
  };

  if (!isVisible || sslErrors === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-red-500 to-orange-500 text-white p-4 rounded-lg shadow-xl max-w-md z-50 animate-pulse">
      <div className="flex items-start gap-3">
        <Shield className="w-6 h-6 mt-1 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-bold text-sm mb-2">Problema de Certificado SSL</h3>
          <p className="text-xs mb-3 opacity-90">
            Railway está teniendo problemas temporales con el certificado SSL. 
            Esto es normal en deployments nuevos y se resolverá automáticamente.
          </p>
          
          <div className="text-xs mb-3 bg-red-600 bg-opacity-50 rounded p-2">
            <strong>Errores detectados:</strong> {sslErrors}<br />
            <strong>Último error:</strong> {lastError?.toLocaleTimeString()}
          </div>

          <div className="flex gap-2 text-xs">
            <button
              onClick={reloadPage}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Recargar
            </button>
            <button
              onClick={tryAlternativeUrl}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded"
            >
              Probar Conexión
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-3 text-xs opacity-75 border-t border-white border-opacity-20 pt-2">
        💡 <strong>Tip:</strong> El modo demo está activo automáticamente para que puedas usar la app mientras se resuelve.
      </div>
    </div>
  );
};

export default SSLErrorNotification;