import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Target, Lightbulb, AlertCircle } from 'lucide-react'
import { analyzeFinancialData, getFinancialRecommendations, getFinancialInsights } from '@shared/api/base'
import useAppStore from '@entities/app/model/appStore'
import toast from 'react-hot-toast'
import LoadingCard from '@shared/ui/LoadingCard'

const Analysis = () => {
  const { aiAnalysis, setAiAnalysis, aiLoading, setAiLoading } = useAppStore()
  const [recommendations, setRecommendations] = useState([])
  const [insights, setInsights] = useState([])
  const [hasStarted, setHasStarted] = useState(false)

  const loadAnalysis = async () => {
    try {
      setAiLoading(true)
      const response = await analyzeFinancialData({ period: 'month' })
      setAiAnalysis(response.analysis)
    } catch (error) {
      toast.error(error.message || 'Error al cargar el análisis de IA');
    } finally {
      setAiLoading(false)
    }
  }

  const loadRecommendations = async () => {
    try {
      const response = await getFinancialRecommendations()
      setRecommendations(response.recommendations)
    } catch (error) {
      console.error('Error loading recommendations:', error)
    }
  }

  const loadInsights = async () => {
    try {
      const response = await getFinancialInsights({ months: 3 })
      setInsights(response.insights)
    } catch (error) {
      console.error('Error loading insights:', error)
    }
  }

  const handleStart = async () => {
    if (hasStarted || aiLoading) return;
    setHasStarted(true)
    await Promise.all([
      loadAnalysis(),
      loadRecommendations(),
      loadInsights()
    ])
  }

  if (aiLoading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <LoadingCard key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          Análisis Financiero IA
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Insights inteligentes sobre tus hábitos financieros
        </p>
      </div>

      {/* Start CTA - simplified content and clear spacing */}
      {!hasStarted && !aiAnalysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-gray-600 dark:text-gray-300">
              Pulsa el botón para comenzar el análisis
            </p>
            <button onClick={handleStart} className="btn-primary sm:self-auto self-start">
              Comenzar análisis
            </button>
          </div>
        </motion.div>
      )}

      {/* AI Analysis Summary */}
      {aiAnalysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Resumen del Análisis
            </h2>
          </div>

          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {aiAnalysis.summary}
          </p>

          {aiAnalysis.score && (
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Puntuación Financiera:
              </span>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-dark-primary to-dark-accent h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(aiAnalysis.score / 10) * 100}%` }}
                />
              </div>
              <span className="text-lg font-bold text-dark-primary">
                {aiAnalysis.score}/10
              </span>
            </div>
          )}

          {aiAnalysis?.warnings && aiAnalysis.warnings.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                    Alertas Importantes
                  </h4>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    {aiAnalysis.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Insights */}
      {aiAnalysis?.insights && aiAnalysis.insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Lightbulb className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Insights Financieros
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiAnalysis.insights.map((insight, index) => (
              <div
                key={index}
                className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 rounded-lg border border-purple-200 dark:border-purple-800"
              >
                <p className="text-gray-700 dark:text-gray-300">{insight}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recomendaciones Personalizadas
            </h2>
          </div>

          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {rec.title}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      rec.impact === 'high'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        : rec.impact === 'medium'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    }`}>
                      {rec.impact} impact
                    </span>
                    {rec.savings && (
                      <span className="text-sm font-medium text-green-600">
                        S/ {rec.savings.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  {rec.description}
                </p>
                {rec.category && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    Categoría: {rec.category}
                  </span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Trends */}
      {aiAnalysis?.trends && aiAnalysis.trends.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Tendencias Identificadas
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aiAnalysis.trends.map((trend, index) => (
              <div
                key={index}
                className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <p className="text-sm text-blue-800 dark:text-blue-300">{trend}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default Analysis
