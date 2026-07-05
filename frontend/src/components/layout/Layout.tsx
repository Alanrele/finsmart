import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import NotificationPanel from './NotificationPanel'
import useAppStore from '../../stores/appStore'

/*
  Frame base estilo Kipu: sidebar fija de 72 (18rem) en escritorio, contenido
  centrado a max-w-7xl con respiro amplio, header + barra inferior en móvil.
*/
const Layout = () => {
  const appReady = useAppStore(state => state.appReady)

  return (
    <div className="min-h-screen bg-base text-main overflow-x-hidden">
      {/* Navegación móvil (header + bottom bar + drawer) */}
      <div className="lg:hidden">
        <Navbar />
      </div>

      {/* Sidebar de escritorio */}
      <aside className="hidden lg:block lg:w-72 lg:fixed lg:inset-y-0 lg:z-30">
        <Sidebar />
      </aside>

      {/* Contenido principal */}
      <div className="lg:pl-72 flex flex-col min-h-screen min-w-0">
        <main className="flex-1 min-w-0 w-full max-w-7xl mx-auto p-4 sm:p-8 lg:p-10 pb-32 lg:pb-10">
          <Outlet />
        </main>
      </div>

      {appReady && <NotificationPanel />}
    </div>
  )
}

export default Layout
