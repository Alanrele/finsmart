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
  FileText,
  Brain,
  Calculator
} from 'lucide-react'
import useAppStore from '../../stores/appStore'

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
    { name: 'Asistente IA+', href: '/ai-assistant', icon: Brain },
    { name: 'Herramientas', href: '/tools', icon: Calculator },
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
      <nav className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800 safe-area-top">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">FinSmart</span>
            </Link>

            {/* Right side buttons */}
            <div className="flex items-center space-x-2">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="h-10 w-10 flex items-center justify-center rounded-xl text-zinc-400 hover:text-primary hover:bg-primary/10 transition"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Menu toggle */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="h-10 w-10 flex items-center justify-center rounded-xl text-zinc-400 hover:text-primary hover:bg-primary/10 transition"
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
        className="fixed top-0 right-0 w-80 h-full bg-white dark:bg-zinc-900 border-l border-zinc-100 dark:border-zinc-800 z-50 lg:hidden safe-area-top"
      >
        <div className="p-4">
          {/* Close button */}
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setIsMenuOpen(false)}
              className="h-10 w-10 flex items-center justify-center rounded-xl text-zinc-400 hover:text-primary hover:bg-primary/10 transition"
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
                        relative flex items-center px-4 py-3 min-h-[44px] rounded-xl transition
                        ${isActive
                          ? 'bg-primary text-white shadow-lg shadow-primary/15'
                          : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="ml-3 font-bold text-sm">{item.name}</span>

                      {isActive && (
                        <motion.div
                          layoutId="mobile-nav-active"
                          className="absolute inset-0 bg-primary rounded-xl -z-10"
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
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-100 dark:border-zinc-800 safe-area-bottom lg:hidden z-30">
        <div className="flex justify-around py-2">
          {navigation.slice(0, 4).map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex flex-col items-center py-2 px-3 min-h-[44px] rounded-xl transition
                  ${isActive
                    ? 'text-primary dark:text-primary-300'
                    : 'text-zinc-400 dark:text-zinc-500'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] mt-1 font-extrabold uppercase tracking-wider">{item.name}</span>

                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
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
