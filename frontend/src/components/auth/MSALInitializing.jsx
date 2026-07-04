import React from 'react'
import { motion } from 'framer-motion'

const MSALInitializing = () => {
  return (
    <div className="min-h-screen bg-page dark:bg-page-dark flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/15"
        >
          <span className="text-white font-bold text-2xl">F</span>
        </motion.div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">FinSmart</h1>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Inicializando autenticación...</p>
      </motion.div>
    </div>
  )
}

export default MSALInitializing
