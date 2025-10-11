/*
  Proyecto: FinSmart
  Autor: Alan Reyes Leandro
  Correo: alanreyesleandro5@gmail.com
  Derechos: © 2025 Alan Reyes Leandro – Todos los derechos reservados.
  Descripción: Pantalla de bienvenida con hero y acceso a login/registro
*/

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, TrendingUp, Shield, Sparkles, Mail, Lock, User, X } from 'lucide-react';
import LoginDialog from './LoginDialog';

// FinSmart Upgrade: Hero animado con transiciones suaves
const WelcomeScreen = ({ onAuthenticated }) => {
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [loginMode, setLoginMode] = useState('login'); // 'login' | 'register'

  // FinSmart Upgrade: Animación de entrada del hero
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  const handleOpenLogin = (mode = 'login') => {
    setLoginMode(mode);
    setShowLoginDialog(true);
  };

  const handleCloseLogin = () => {
    setShowLoginDialog(false);
  };

  return (
    <>
      {/* Hero Section */}
      <motion.div
        className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header con logo */}
        <motion.header
          className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10"
          variants={itemVariants}
        >
          <div className="flex items-center space-x-2">
            <Wallet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <span className="text-2xl font-bold text-gray-800 dark:text-white">FinSmart</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            © 2025 Alan Reyes Leandro
          </div>
        </motion.header>

        {/* Contenido principal */}
        <div className="flex flex-col items-center justify-center min-h-screen px-4 pt-20 pb-16">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            variants={itemVariants}
          >
            {/* Logo principal */}
            <motion.div
              className="mb-8 flex justify-center"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full"></div>
                <Wallet className="w-24 h-24 text-blue-600 dark:text-blue-400 relative z-10" />
              </div>
            </motion.div>

            {/* Título y eslogan */}
            <motion.h1
              className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent"
              variants={itemVariants}
            >
              Bienvenido a FinSmart
            </motion.h1>

            <motion.p
              className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-4"
              variants={itemVariants}
            >
              Tu asistente financiero inteligente
            </motion.p>

            <motion.p
              className="text-base text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto"
              variants={itemVariants}
            >
              Gestiona tus finanzas de forma inteligente con análisis automático de transacciones,
              integración con Outlook y asistente AI personalizado
            </motion.p>

            {/* Botones de acción */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
              variants={itemVariants}
            >
              <motion.button
                onClick={() => handleOpenLogin('login')}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
                whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(59, 130, 246, 0.3)" }}
                whileTap={{ scale: 0.95 }}
              >
                <Mail className="w-5 h-5" />
                <span>Iniciar Sesión</span>
              </motion.button>

              <motion.button
                onClick={() => handleOpenLogin('register')}
                className="px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-semibold rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700 transition-all duration-200 flex items-center justify-center space-x-2"
                whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
                whileTap={{ scale: 0.95 }}
              >
                <User className="w-5 h-5" />
                <span>Crear Cuenta</span>
              </motion.button>
            </motion.div>

            {/* Features grid */}
            <motion.div
              className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto"
              variants={itemVariants}
            >
              <motion.div
                className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg"
                whileHover={{ y: -5, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
              >
                <TrendingUp className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">
                  Análisis Inteligente
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  AI que categoriza automáticamente tus transacciones
                </p>
              </motion.div>

              <motion.div
                className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg"
                whileHover={{ y: -5, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
              >
                <Mail className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">
                  Integración Outlook
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Sincroniza notificaciones bancarias automáticamente
                </p>
              </motion.div>

              <motion.div
                className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg"
                whileHover={{ y: -5, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
              >
                <Shield className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">
                  Seguro y Privado
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tus datos están protegidos con encriptación de nivel bancario
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.footer
          className="absolute bottom-0 left-0 right-0 p-6 text-center text-sm text-gray-500 dark:text-gray-400"
          variants={itemVariants}
        >
          <p>
            FinSmart © 2025 – Todos los derechos reservados
          </p>
          <p className="text-xs mt-1">
            Desarrollado por Alan Reyes Leandro | alanreyesleandro5@gmail.com
          </p>
        </motion.footer>
      </motion.div>

      {/* Modal de login/registro */}
      <AnimatePresence>
        {showLoginDialog && (
          <LoginDialog
            isOpen={showLoginDialog}
            onClose={handleCloseLogin}
            initialMode={loginMode}
            onAuthenticated={onAuthenticated}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default WelcomeScreen;
