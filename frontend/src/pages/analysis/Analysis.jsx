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
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
          Análisis Financiero IA
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Insights inteligentes sobre tus hábitos financieros
        </p>
      </div>

      {/* Start CTA */}
      {!hasStarted && !aiAnalysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-slate-600 dark:text-slate-300">
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
            <div className="p-2 bg-brand-100 dark:bg-brand-900/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Resumen del Análisis
            </h2>
          </div>

          <p className="text-slate-700 dark:text-slate-300 mb-4">
            {aiAnalysis.summary}
          </p>

          {aiAnalysis.score && (
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Puntuación Financiera:
              </span>
              <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-brand-600 to-accent-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(aiAnalysis.score / 10) * 100}%` }}
                />
              </div>
              <span className="text-lg font-bold text-brand-600 dark:text-brand-400">
                {aiAnalysis.score}/10
              </span>
            </div>
          )}

          {aiAnalysis?.warnings && aiAnalysis.warnings.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                    Alertas Importantes
                  </h4>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
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
            <div className="p-2 bg-violet-100 dark:bg-violet-900/20 rounded-lg">
              <Lightbulb className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Insights Financieros
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiAnalysis.insights.map((insight, index) => (
              <div
                key={index}
                className="p-4 bg-gradient-to-r from-violet-50 to-brand-50 dark:from-violet-900/10 dark:to-brand-900/10 rounded-lg border border-violet-200 dark:border-violet-800"
              >
                <p className="text-slate-700 dark:text-slate-300">{insight}</p>
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
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
              <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Recomendaciones Personalizadas
            </h2>
          </div>

          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-slate-900 dark:text-white">
                    {rec.title}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      rec.impact === 'high'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        : rec.impact === 'medium'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
                    }`}>
                      {rec.impact} impact
                    </span>
                    {rec.savings && (
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        S/ {rec.savings.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 mb-2">
                  {rec.description}
                </p>
                {rec.category && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
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
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Tendencias Identificadas
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aiAnalysis.trends.map((trend, index) => (
              <div
                key={index}
                className="p-3 bg-brand-50 dark:bg-brand-900/10 rounded-lg border border-brand-200 dark:border-brand-800"
              >
                <p className="text-sm text-brand-800 dark:text-brand-300">{trend}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default Analysis
