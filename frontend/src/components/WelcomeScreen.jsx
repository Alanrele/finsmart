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

  // FinSmart Upgrade: Animación de entrada del hero (más lenta y apreciable)
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 1.2,
        staggerChildren: 0.4,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
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
        {/* Header con logo - mejorado para modo claro */}
        <motion.header
          className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="flex items-center space-x-3">
            <Wallet className="w-9 h-9 text-blue-600 dark:text-blue-400" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">FinSmart</span>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
            © 2025 Alan Reyes Leandro
          </div>
        </motion.header>

        {/* Contenido principal */}
        <div className="flex flex-col items-center justify-center min-h-screen px-4 pt-20 pb-16">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            variants={itemVariants}
          >
            {/* Logo principal con animación más lenta */}
            <motion.div
              className="mb-10 flex justify-center"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                duration: 1,
                delay: 0.3,
                type: "spring",
                stiffness: 200,
                damping: 15
              }}
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-30 rounded-full animate-pulse"></div>
                <Wallet className="w-28 h-28 text-blue-600 dark:text-blue-400 relative z-10" />
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

            {/* Botones de acción con animaciones mejoradas */}
            <motion.div
              className="flex flex-col sm:flex-row gap-5 justify-center mb-20"
              variants={itemVariants}
            >
              <motion.button
                onClick={() => handleOpenLogin('login')}
                className="px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl shadow-xl transition-all duration-300 flex items-center justify-center space-x-2 text-lg"
                whileHover={{
                  scale: 1.08,
                  boxShadow: "0 25px 30px -5px rgba(59, 130, 246, 0.4)",
                  y: -3
                }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <Mail className="w-6 h-6" />
                <span>Iniciar Sesión</span>
              </motion.button>

              <motion.button
                onClick={() => handleOpenLogin('register')}
                className="px-10 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold rounded-xl shadow-xl border-2 border-gray-300 dark:border-gray-700 transition-all duration-300 flex items-center justify-center space-x-2 text-lg"
                whileHover={{
                  scale: 1.08,
                  boxShadow: "0 25px 30px -5px rgba(0, 0, 0, 0.15)",
                  y: -3
                }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <User className="w-6 h-6" />
                <span>Crear Cuenta</span>
              </motion.button>
            </motion.div>

            {/* Features grid con animaciones individuales más lentas */}
            <motion.div
              className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto"
              variants={itemVariants}
            >
              <motion.div
                className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.2 }}
                whileHover={{
                  y: -8,
                  boxShadow: "0 25px 30px -5px rgba(59, 130, 246, 0.2)",
                  scale: 1.03
                }}
              >
                <TrendingUp className="w-14 h-14 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                  Análisis Inteligente
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                  AI que categoriza automáticamente tus transacciones
                </p>
              </motion.div>

              <motion.div
                className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.4 }}
                whileHover={{
                  y: -8,
                  boxShadow: "0 25px 30px -5px rgba(59, 130, 246, 0.2)",
                  scale: 1.03
                }}
              >
                <Mail className="w-14 h-14 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                  Integración Outlook
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                  Sincroniza notificaciones bancarias automáticamente
                </p>
              </motion.div>

              <motion.div
                className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.6 }}
                whileHover={{
                  y: -8,
                  boxShadow: "0 25px 30px -5px rgba(59, 130, 246, 0.2)",
                  scale: 1.03
                }}
              >
                <Shield className="w-14 h-14 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                  Seguro y Privado
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                  Tus datos están protegidos con encriptación de nivel bancario
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* Footer - mejorado para modo claro */}
        <motion.footer
          className="absolute bottom-0 left-0 right-0 p-6 text-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
            FinSmart © 2025 – Todos los derechos reservados
          </p>
          <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">
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
