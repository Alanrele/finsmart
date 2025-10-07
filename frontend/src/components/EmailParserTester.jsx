import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Send, CheckCircle, AlertCircle, Copy } from 'lucide-react'
import { graphAPI, handleApiError } from '../services/api'
import toast from 'react-hot-toast'

const EmailParserTester = () => {
  const [emailContent, setEmailContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleTest = async () => {
    if (!emailContent.trim()) {
      toast.error('Por favor ingresa el contenido del email')
      return
    }

    try {
      setLoading(true)
      console.log('🧪 Testing email parser...')
      const response = await graphAPI.testEmailParser(emailContent)
      console.log('✅ Parser result:', response.data)
      setResult(response.data)
      toast.success('Email parseado correctamente')
    } catch (error) {
      const errorInfo = handleApiError(error)
      toast.error(errorInfo.message)
      console.error('❌ Parser test error:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(JSON.stringify(text, null, 2))
    toast.success('Copiado al portapapeles')
  }

  const sampleEmailHTML = `<!DOCTYPE html>
<html>
<body>
<table>
  <tr><td>Fecha y hora</td><td>15 de octubre de 2024 - 14:30 PM</td></tr>
  <tr><td>Operación realizada</td><td>Pago a comercio</td></tr>
  <tr><td>Monto</td><td><b>S/ 125.50</b></td></tr>
  <tr><td>Empresa</td><td>SUPERMERCADO PLAZA VEA</td></tr>
  <tr><td>Número de tarjeta de débito</td><td>****1234</td></tr>
  <tr><td>Canal</td><td>POS</td></tr>
  <tr><td>Número de operación</td><td>202410151430001</td></tr>
</table>
</body>
</html>`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          Email Parser Tester
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Prueba la funcionalidad de parsing de emails bancarios
        </p>
      </div>

      {/* Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Contenido del Email
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pega aquí el HTML del email bancario
            </label>
            <textarea
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              className="w-full h-40 p-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Pega el contenido HTML del email aquí..."
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setEmailContent(sampleEmailHTML)}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Usar email de ejemplo
            </button>
            
            <button
              onClick={handleTest}
              disabled={loading || !emailContent.trim()}
              className="btn-primary flex items-center space-x-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{loading ? 'Procesando...' : 'Probar Parser'}</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Results Section */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Success Message */}
          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Email parseado exitosamente</span>
          </div>

          {/* Parsed Data */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Datos Extraídos
              </h3>
              <button
                onClick={() => copyToClipboard(result.parsedData)}
                className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <Copy className="w-4 h-4" />
                <span>Copiar</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(result.parsedData || {}).map(([key, value]) => (
                <div key={key} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="font-medium text-gray-900 dark:text-white capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className="text-gray-600 dark:text-gray-300 mt-1">
                    {value || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction Data */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Transacción Generada
              </h3>
              <button
                onClick={() => copyToClipboard(result.transactionData)}
                className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <Copy className="w-4 h-4" />
                <span>Copiar</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="font-medium text-blue-900 dark:text-blue-100">Monto</div>
                  <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    {result.transactionData?.currency} {result.transactionData?.amount}
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="font-medium text-green-900 dark:text-green-100">Tipo</div>
                  <div className="text-lg font-semibold text-green-700 dark:text-green-300 capitalize">
                    {result.transactionData?.type}
                  </div>
                </div>
                
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="font-medium text-purple-900 dark:text-purple-100">Categoría</div>
                  <div className="text-lg font-semibold text-purple-700 dark:text-purple-300">
                    {result.transactionData?.category}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="font-medium text-gray-900 dark:text-white mb-2">Descripción</div>
                <div className="text-gray-600 dark:text-gray-300">
                  {result.transactionData?.description}
                </div>
              </div>

              {result.transactionData?.metadata && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="font-medium text-gray-900 dark:text-white mb-2">Metadatos</div>
                  <pre className="text-xs text-gray-600 dark:text-gray-300 overflow-x-auto">
                    {JSON.stringify(result.transactionData.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default EmailParserTester