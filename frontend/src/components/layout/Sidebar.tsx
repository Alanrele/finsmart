import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Receipt,
  Sparkles,
  MessageSquare,
  PiggyBank,
  Calculator,
  Mail,
  Settings as SettingsIcon,
  LogOut,
  Sun,
  Moon,
  UserCheck,
} from 'lucide-react'
import useAuthStore from '../../stores/authStore'
import useAppStore from '../../stores/appStore'
import { KipuIcon } from '../common/BrandLogo'

/*
  Sidebar de escritorio con la identidad Kipu: superficie beige, marca squircle,
  navegación en pills redondeadas y tarjeta "Platinum" al pie. Conserva el
  router (react-router) y el estado/auth existentes.
*/
const Sidebar = () => {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { theme, setTheme } = useAppStore()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Transacciones', href: '/transactions', icon: Receipt },
    { name: 'Análisis', href: '/analysis', icon: Sparkles },
    { name: 'Chat IA', href: '/chat', icon: MessageSquare },
    { name: 'Asistente IA+', href: '/ai-assistant', icon: PiggyBank },
    { name: 'Herramientas', href: '/tools', icon: Calculator },
    { name: 'Outlook', href: '/outlook', icon: Mail },
    { name: 'Configuración', href: '/settings', icon: SettingsIcon },
  ]

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-subtle">
      {/* Marca */}
      <div className="p-8 border-b border-subtle flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3">
          <KipuIcon size={40} className="rounded-2xl shadow-lg" />
          <div>
            <span className="text-xl font-extrabold tracking-tight text-main font-display block leading-none">Kipu</span>
            <span className="text-[10px] text-muted font-mono block tracking-widest mt-1">PLATINUM SECURE</span>
          </div>
        </Link>
        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-card rounded-xl text-muted hover:text-main transition-all"
          title="Cambiar tema"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`w-full flex items-center gap-3.5 px-4 py-3 min-h-[44px] rounded-2xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-brand-primary text-white dark:bg-brand-primary/15 dark:text-brand-primary border border-brand-primary/25 shadow-sm'
                  : 'text-main/85 hover:text-main hover:bg-white/60 dark:text-muted dark:hover:text-main dark:hover:bg-card/50 border border-transparent'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-white dark:text-brand-primary' : 'text-main/70 dark:text-muted'} />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Pie: tarjeta de cuenta + cerrar sesión */}
      <div className="p-6 border-t border-subtle space-y-3">
        <div className="ios-glass p-4 rounded-full flex items-center gap-3.5 shadow-lg">
          <div className="w-10 h-10 rounded-full bg-brand-primary/25 text-brand-primary border border-brand-primary/20 flex items-center justify-center shrink-0">
            <UserCheck size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-extrabold text-main block truncate">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Kipu Platinum'}
            </span>
            <span className="text-[9px] text-muted font-mono tracking-widest uppercase block mt-0.5 truncate">
              {user?.email || 'MEMBER'}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-bold text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all"
        >
          <LogOut size={16} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  )
}

export default Sidebar
