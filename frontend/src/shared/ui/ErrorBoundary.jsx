import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Check if this is a browser extension error
    const isExtensionError = error.message && (
      error.message.includes('message channel closed') ||
      error.message.includes('listener indicated an asynchronous response') ||
      error.message.includes('Extension context invalidated') ||
      error.message.includes('chrome-extension://')
    )

    if (isExtensionError) {
      console.warn('🚫 Browser extension error caught by ErrorBoundary:', error.message)
      // Don't set error state for extension errors - let the app continue
      this.setState({ hasError: false, error: null, errorInfo: null })
      return
    }

    // Log the error for debugging
    console.error('🚨 React Error Boundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-800 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Algo salió mal
            </h2>
            <p className="text-gray-400 mb-6">
              Ha ocurrido un error inesperado. Esto puede ser causado por una extensión del navegador.
            </p>

            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>

              <details className="text-left">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400">
                  Detalles técnicos
                </summary>
                <pre className="mt-2 text-xs text-red-400 bg-gray-900 p-2 rounded overflow-auto max-h-32">
                  {this.state.error && this.state.error.toString()}
                  {this.state.errorInfo && (
                    <div className="mt-2">
                      {this.state.errorInfo.componentStack}
                    </div>
                  )}
                </pre>
              </details>
            </div>

            <div className="mt-6 text-xs text-gray-500">
              <p>💡 Si el problema persiste, intenta:</p>
              <ul className="mt-1 text-left list-disc list-inside">
                <li>Desactivar extensiones del navegador</li>
                <li>Limpiar caché del navegador</li>
                <li>Usar modo incógnito</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
