import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Home,
  CreditCard,
  TrendingUp,
  MessageSquare,
  Mail,
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  FileText
} from 'lucide-react'
import useAppStore from '../stores/appStore'

const Navbar = () => {
  const location = useLocation()
  const { theme, setTheme } = useAppStore()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const debugEnabled = (typeof window !== 'undefined' && window.localStorage.getItem('finsmart:debug') === '1') ||
    (typeof import.meta !== 'undefined' && String(import.meta.env.VITE_ENABLE_DEBUG || '').toLowerCase() === 'true')

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Transacciones', href: '/transactions', icon: CreditCard },
    { name: 'Análisis', href: '/analysis', icon: TrendingUp },
    { name: 'Chat IA', href: '/chat', icon: MessageSquare },
    { name: 'Outlook', href: '/outlook', icon: Mail },
    ...(debugEnabled ? [{ name: 'Email Parser', href: '/email-parser', icon: FileText }] : []),
    { name: 'Configuración', href: '/settings', icon: Settings },
  ]

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <>
      {/* Top navigation bar */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 safe-area-top">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-dark-primary to-dark-accent rounded-lg flex items-center justify-center">
                <span className="text-dark-bg font-bold text-sm">F</span>
              </div>
              <span className="text-xl font-bold text-gradient">FinSmart</span>
            </Link>

            {/* Right side buttons */}
            <div className="flex items-center space-x-2">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Menu toggle */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Mobile menu */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: isMenuOpen ? 0 : '100%' }}
        transition={{ type: 'tween', duration: 0.3 }}
        className="fixed top-0 right-0 w-80 h-full bg-white dark:bg-gray-900 z-50 lg:hidden safe-area-top"
      >
        <div className="p-4">
          {/* Close button */}
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation links */}
          <nav>
            <ul className="space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                const Icon = item.icon

                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`
                        relative flex items-center px-4 py-3 rounded-lg transition-all duration-200
                        ${isActive
                          ? 'bg-gradient-to-r from-dark-primary to-dark-accent text-dark-bg shadow-lg'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="ml-3 font-medium">{item.name}</span>

                      {isActive && (
                        <motion.div
                          layoutId="mobile-nav-active"
                          className="absolute inset-0 bg-gradient-to-r from-dark-primary to-dark-accent rounded-lg -z-10"
                          initial={false}
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      </motion.div>

      {/* Bottom navigation for mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 safe-area-bottom lg:hidden z-30">
        <div className="flex justify-around py-2">
          {navigation.slice(0, 4).map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200
                  ${isActive
                    ? 'text-dark-primary'
                    : 'text-gray-400 dark:text-gray-500'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs mt-1 font-medium">{item.name}</span>

                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-dark-primary rounded-full"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default Navbar
