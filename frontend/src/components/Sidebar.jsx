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
import useAuthStore from '../stores/authStore'
import useAppStore from '../stores/appStore'

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
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800">
      {/* Logo */}
      <div className="p-6">
        <Link to="/dashboard" className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          {!isCollapsed && (
            <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">FinSmart</span>
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
                    relative flex items-center px-3 py-3 min-h-[44px] rounded-xl transition
                    ${isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/15'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {!isCollapsed && (
                    <span className="ml-3 font-bold text-sm">{item.name}</span>
                  )}

                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
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

      {/* User section */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center px-3 py-2 mb-3 text-zinc-500 dark:text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-xl transition"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {!isCollapsed && (
            <span className="ml-3 font-bold text-sm">
              {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
            </span>
          )}
        </button>

        {/* User profile */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary dark:text-primary-300" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {user?.email}
              </p>
            </div>
          )}
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition"
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && (
            <span className="ml-3 font-bold text-sm">Cerrar Sesión</span>
          )}
        </button>
      </div>
    </div>
  )
}

export default Sidebar
