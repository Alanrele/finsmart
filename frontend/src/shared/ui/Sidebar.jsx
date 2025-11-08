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
  LogOut,
  Sun,
  Moon,
  User,
  Brain,
  Calculator
} from 'lucide-react'
import useAuthStore from '@entities/session/model/authStore'
import useAppStore from '@entities/app/model/appStore'

const Sidebar = () => {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { theme, setTheme } = useAppStore()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Transacciones', href: '/transactions', icon: CreditCard },
    { name: 'Análisis', href: '/analysis', icon: TrendingUp },
    { name: 'Chat IA', href: '/chat', icon: MessageSquare },
    { name: 'Asistente IA+', href: '/ai-assistant', icon: Brain },
    { name: 'Herramientas', href: '/tools', icon: Calculator },
    { name: 'Outlook', href: '/outlook', icon: Mail },
    { name: 'Configuración', href: '/settings', icon: Settings },
  ]

  const handleLogout = () => {
    logout()
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* Logo */}
      <div className="p-6">
        <Link to="/dashboard" className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-dark-primary to-dark-accent rounded-lg flex items-center justify-center">
            <span className="text-dark-bg font-bold text-sm">F</span>
          </div>
          {!isCollapsed && (
            <span className="text-xl font-bold text-gradient">FinSmart</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon

            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`
                    relative flex items-center px-3 py-3 rounded-lg transition-all duration-200
                    ${isActive
                      ? 'bg-gradient-to-r from-dark-primary to-dark-accent text-dark-bg shadow-lg'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {!isCollapsed && (
                    <span className="ml-3 font-medium">{item.name}</span>
                  )}

                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
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

      {/* User section */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center px-3 py-2 mb-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {!isCollapsed && (
            <span className="ml-3 font-medium">
              {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
            </span>
          )}
        </button>

        {/* User profile */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-dark-primary rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-dark-bg" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.email}
              </p>
            </div>
          )}
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && (
            <span className="ml-3 font-medium">Cerrar Sesión</span>
          )}
        </button>
      </div>
    </div>
  )
}

export default Sidebar
