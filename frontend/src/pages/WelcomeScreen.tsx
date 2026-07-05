/*
  Proyecto: Kipu
  Autor: Alan Reyes Leandro
  Correo: alanreyesleandro5@gmail.com
  Derechos: © 2025 Alan Reyes Leandro – Todos los derechos reservados.
  Descripción: Pantalla de bienvenida con hero y acceso a login/registro
*/

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { TrendingUp, Shield, Mail, User } from 'lucide-react';
import LoginDialog from '../components/auth/LoginDialog';
import BrandLogo, { KipuIcon } from '../components/common/BrandLogo';

const features = [
  {
    icon: Mail,
    tint: 'bg-primary/10 text-primary dark:text-primary-300',
    title: 'Lee tus correos del BCP',
    text: 'Cada notificación del banco se convierte sola en una transacción registrada.'
  },
  {
    icon: TrendingUp,
    tint: 'bg-sage-600/10 text-sage-700 dark:text-sage-300',
    title: 'Entiende tus gastos',
    text: 'Categorías, tendencias y consejos generados con IA sobre tus datos reales.'
  },
  {
    icon: Shield,
    tint: 'bg-taupe-400/10 text-taupe-600 dark:text-taupe-300',
    title: 'Tuyo y privado',
    text: 'Solo se procesan las notificaciones del BCP. Puedes desconectar y borrar todo cuando quieras.'
  }
];

const WelcomeScreen = ({ onAuthenticated }) => {
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [loginMode, setLoginMode] = useState('login'); // 'login' | 'register'

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.6, staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
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
      <motion.div
        className="min-h-screen bg-page dark:bg-page-dark flex flex-col"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.header
          className="px-4 sm:px-6 py-4 flex justify-between items-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800 safe-area-top"
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <BrandLogo iconSize={32} />
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
            © 2025 Alan Reyes Leandro
          </div>
        </motion.header>

        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-14">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div className="mb-8 flex justify-center" variants={itemVariants}>
              <KipuIcon size={88} />
            </motion.div>

            <motion.span className="eyebrow" variants={itemVariants}>
              Finanzas personales · BCP
            </motion.span>

            <motion.h1
              className="mt-3 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.05]"
              variants={itemVariants}
            >
              Cada sol,{' '}
              <span className="text-primary dark:text-primary-300">anudado</span>
              {' '}y en orden.
            </motion.h1>

            <motion.p
              className="mt-5 text-base sm:text-lg text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed"
              variants={itemVariants}
            >
              Como el quipu llevaba las cuentas del ande, Kipu convierte las
              notificaciones del BCP en tu correo en un registro claro de gastos,
              ingresos y tendencias.
            </motion.p>

            {/* Acciones */}
            <motion.div
              className="mt-10 flex flex-col sm:flex-row gap-3 justify-center"
              variants={itemVariants}
            >
              <button
                onClick={() => handleOpenLogin('login')}
                className="btn-primary min-h-[48px] px-8 active:scale-[0.99]"
              >
                <Mail className="w-4 h-4" />
                Iniciar sesión
              </button>
              <button
                onClick={() => handleOpenLogin('register')}
                className="btn-secondary min-h-[48px] px-8 active:scale-[0.99]"
              >
                <User className="w-4 h-4" />
                Crear cuenta
              </button>
            </motion.div>

            {/* Features */}
            <motion.div
              className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 text-left"
              variants={itemVariants}
            >
              {features.map(({ icon: Icon, tint, title, text }) => (
                <div key={title} className="card p-5">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center mb-3 ${tint}`}>
                    <Icon className="w-4 h-4" strokeWidth={2.25} />
                  </div>
                  <h3 className="text-[15px] font-bold leading-tight text-zinc-900 dark:text-zinc-50 mb-1.5">
                    {title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {text}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <motion.footer
          className="px-6 py-5 text-center border-t border-zinc-100 dark:border-zinc-800 safe-area-bottom"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Kipu © 2025 – Todos los derechos reservados · Desarrollado por Alan Reyes Leandro
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
