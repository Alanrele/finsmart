import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import NotificationPanel from './NotificationPanel'
import useAppStore from '../../stores/appStore'

/*
  Shell de la app con el patrón de navegación de Kipu (SIN sidebar fijo):
  header glass superior + barra inferior flotante + drawer derecho (todo en
  Navbar), en todos los breakpoints. El contenido ocupa el ancho completo,
  centrado a max-w-7xl, con padding inferior suficiente para que la barra
  flotante no tape nada.
*/
const Layout = () => {
  const appReady = useAppStore(state => state.appReady)

  return (
    <div className="min-h-screen bg-base text-main overflow-x-hidden">
      {/* Header + barra flotante + drawer (todos los breakpoints) */}
      <Navbar />

      {/* Contenido: ancho completo, centrado, con respiro inferior para la barra */}
      <main className="w-full max-w-7xl mx-auto min-w-0 px-4 sm:px-6 lg:px-8 pt-6 pb-32">
        <Outlet />
      </main>

      {appReady && <NotificationPanel />}
    </div>
  )
}

export default Layout
