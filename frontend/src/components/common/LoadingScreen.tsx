import React from 'react'
import { motion } from 'framer-motion'
import { KipuIcon } from './BrandLogo'

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-page dark:bg-page-dark flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto mb-4 w-16 h-16 motion-reduce:animate-none"
        >
          <KipuIcon size={64} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold tracking-tight lowercase text-zinc-900 dark:text-zinc-50 mb-2"
        >
          kipu
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-sm font-medium text-zinc-500 dark:text-zinc-400"
        >
          Cargando tu análisis financiero...
        </motion.p>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="h-1 bg-gradient-to-r from-primary to-sage rounded-full mt-6 mx-auto max-w-xs"
        />
      </motion.div>
    </div>
  )
}

export default LoadingScreen
