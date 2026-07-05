import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
  X,
  MoreHorizontal,
  FileText,
  UserCheck,
} from 'lucide-react'
import useAppStore from '../../stores/appStore'
import useAuthStore from '../../stores/authStore'
import { KipuIcon } from '../common/BrandLogo'

/*
  Navegación principal estilo Kipu en TODOS los breakpoints (sin sidebar fijo):
  header glass superior + barra inferior flotante (squircle glass, centrada y de
  ancho contenido) + drawer lateral derecho con la navegación completa y la
  tarjeta de usuario. Conserva router, rutas y auth.
*/
const Navbar = () => {
  const location = useLocation()
  const { theme, setTheme } = useAppStore()
  const { user, logout } = useAuthStore()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const debugEnabled = (typeof window !== 'undefined' && window.localStorage.getItem('finsmart:debug') === '1') ||
    (typeof import.meta !== 'undefined' && String(import.meta.env.VITE_ENABLE_DEBUG || '').toLowerCase() === 'true')

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Transacciones', href: '/transactions', icon: Receipt },
    { name: 'Análisis', href: '/analysis', icon: Sparkles },
    { name: 'Chat IA', href: '/chat', icon: MessageSquare },
    { name: 'Asistente IA+', href: '/ai-assistant', icon: PiggyBank },
    { name: 'Herramientas', href: '/tools', icon: Calculator },
    { name: 'Outlook', href: '/outlook', icon: Mail },
    ...(debugEnabled ? [{ name: 'Email Parser', href: '/email-parser', icon: FileText }] : []),
    { name: 'Configuración', href: '/settings', icon: SettingsIcon },
  ]

  const bottomBar = [
    { name: 'Dashboard', label: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Transacciones', label: 'Historial', href: '/transactions', icon: Receipt },
    { name: 'Chat IA', label: 'Kipu AI', href: '/chat', icon: MessageSquare },
    { name: 'Asistente IA+', label: 'Metas', href: '/ai-assistant', icon: PiggyBank },
  ]

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  // Bloquear scroll del fondo mientras el drawer está abierto
  useEffect(() => {
    if (isMenuOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [isMenuOpen])

  return (
    <>
      {/* Header glass superior (todos los breakpoints) */}
      <header className="h-16 ios-glass-header px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 safe-area-top">
        <Link to="/dashboard" className="flex items-center gap-3">
          <KipuIcon size={36} className="rounded-xl shadow-md" />
          <div>
            <span className="font-extrabold text-main tracking-tight font-display text-base leading-none">Kipu</span>
            <span className="text-[8px] text-brand-primary font-mono tracking-widest uppercase block mt-0.5 font-bold">Platinum Secure</span>
          </div>
        </Link>
        <button
          onClick={toggleTheme}
          className="p-2 text-muted hover:text-main hover:bg-card/40 rounded-xl transition-all cursor-pointer"
          title="Cambiar tema"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* Barra inferior flotante (centrada, ancho contenido, en todos los breakpoints) */}
      <div className="fixed bottom-5 left-4 right-4 z-40 safe-area-bottom pointer-events-none">
        <div className="ios-glass shadow-2xl rounded-3xl px-3 py-1.5 flex items-center justify-between max-w-lg mx-auto pointer-events-auto">
          {bottomBar.map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                className="flex-1 flex flex-col items-center justify-center py-1 min-h-[44px] relative"
              >
                <div className={`p-2 rounded-2xl transition-all duration-300 relative ${
                  isActive ? 'text-brand-primary bg-brand-primary/15 scale-110' : 'text-main/65 dark:text-muted hover:text-main'
                }`}>
                  <Icon size={20} />
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-active"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-primary"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </div>
                <span className={`text-[9px] font-extrabold tracking-tight mt-0.5 ${isActive ? 'text-brand-primary' : 'text-main/75 dark:text-muted'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
          {/* Más: abre el drawer con la navegación completa */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center py-1 min-h-[44px] cursor-pointer"
          >
            <div className="p-2 rounded-2xl text-main/65 dark:text-muted hover:text-main transition-all">
              <MoreHorizontal size={20} />
            </div>
            <span className="text-[9px] font-extrabold tracking-tight mt-0.5 text-main/75 dark:text-muted">Más</span>
          </button>
        </div>
      </div>

      {/* Drawer lateral derecho con la navegación completa */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-black/45 backdrop-blur-[1.5px]"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-80 max-w-[85vw] bg-sidebar/95 backdrop-blur-xl border-l border-subtle h-full p-8 flex flex-col justify-between shadow-2xl z-10 safe-area-top overflow-y-auto"
            >
              <div>
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-subtle">
                  <div className="flex items-center gap-3">
                    <KipuIcon size={40} className="rounded-2xl shadow-md" />
                    <span className="font-extrabold text-main tracking-tight font-display text-xl">Kipu</span>
                  </div>
                  <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-card/40 rounded-xl text-muted hover:text-main transition-all cursor-pointer">
                    <X size={18} />
                  </button>
                </div>

                <nav className="space-y-1.5">
                  {navigation.map((item) => {
                    const isActive = location.pathname === item.href
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={`w-full flex items-center gap-3.5 px-4 py-3 min-h-[44px] rounded-2xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-brand-primary text-white dark:bg-brand-primary/20 dark:text-brand-primary border border-brand-primary/30 shadow-md'
                            : 'text-main/85 hover:text-main hover:bg-white/60 dark:text-muted dark:hover:text-main dark:hover:bg-card/40'
                        }`}
                      >
                        <Icon size={16} className={isActive ? 'text-white dark:text-brand-primary' : 'text-main/70 dark:text-muted'} />
                        <span>{item.name}</span>
                      </Link>
                    )
                  })}
                </nav>
              </div>

              <div className="space-y-3 pt-6">
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
                  onClick={() => { setIsMenuOpen(false); logout() }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-bold text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

export default Navbar
