import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import NotificationPanel from './NotificationPanel'

const Layout = () => {
  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <Navbar />
      </div>

      <div className="lg:flex">
        {/* Sidebar - Hidden on mobile */}
        <div className="hidden lg:block lg:w-64 lg:fixed lg:inset-y-0">
          <Sidebar />
        </div>

        {/* Main content */}
        <div className="lg:pl-64 flex flex-col min-h-screen">
          <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Notification Panel */}
      <NotificationPanel />
    </div>
  )
}

export default Layout
