import React from 'react'
import { motion } from 'framer-motion'

const LoadingCard = ({ className = "" }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`card ${className}`}
    >
      <div className="animate-pulse pointer-events-none min-h-[120px]">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    </motion.div>
  )
}

export default LoadingCard
