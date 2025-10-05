import React from 'react'
import { motion } from 'framer-motion'

const MSALInitializing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-gray-900 to-dark-bg flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 bg-gradient-to-r from-dark-primary to-dark-accent rounded-xl flex items-center justify-center mx-auto mb-4"
        >
          <span className="text-dark-bg font-bold text-2xl">F</span>
        </motion.div>
        <h1 className="text-2xl font-bold text-dark-text mb-2">FinSmart</h1>
        <p className="text-gray-400">Inicializando autenticación...</p>
      </motion.div>
    </div>
  )
}

export default MSALInitializing
