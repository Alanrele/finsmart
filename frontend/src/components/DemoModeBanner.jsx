import React from 'react';
import { Monitor, Wifi } from 'lucide-react';

const DemoModeBanner = ({ isActive }) => {
  if (!isActive) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 text-center text-sm font-medium z-40 shadow-lg">
      <div className="flex items-center justify-center gap-2">
        <Monitor className="w-4 h-4" />
        <span>🎭 MODO DEMO ACTIVO</span>
        <span className="hidden sm:inline">- Datos de ejemplo | Backend SSL en reparación</span>
        <Wifi className="w-4 h-4 opacity-50" />
      </div>
    </div>
  );
};

export default DemoModeBanner;