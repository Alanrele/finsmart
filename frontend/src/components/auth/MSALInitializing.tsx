import React from 'react'
import { motion } from 'framer-motion'
import { KipuIcon } from '../common/BrandLogo'

const MSALInitializing = () => {
  return (
    <div className="min-h-screen bg-page dark:bg-page-dark flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto mb-4 w-16 h-16 motion-reduce:animate-none"
        >
          <KipuIcon size={64} />
        </motion.div>
        <h1 className="text-2xl font-bold tracking-tight lowercase text-zinc-900 dark:text-zinc-50 mb-2">kipu</h1>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Inicializando autenticación...</p>
      </motion.div>
    </div>
  )
}

export default MSALInitializing
