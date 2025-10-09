import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import { useMicrosoftAuth } from '../hooks/useMicrosoftAuth';
import { loginUser, registerUser } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const { login, setLoading, isLoading } = useAuthStore();
  const { loginMicrosoft } = useMicrosoftAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    confirmPassword: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        // Registration
        if (formData.password !== formData.confirmPassword) {
          toast.error('Las contraseñas no coinciden');
          setLoading(false);
          return;
        }

        const data = await registerUser({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName
        });

        login(data.user, data.token);
        toast.success('Cuenta creada exitosamente');
        navigate('/dashboard');
      } else {
        // Login
        const data = await loginUser({
          email: formData.email,
          password: formData.password
        });

        login(data.user, data.token);
        toast.success('Inicio de sesión exitoso');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.message || 'Ocurrió un error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setLoading(true);

    try {
      await loginMicrosoft();
    } catch (error) {
      console.error('Microsoft login error:', error);
      if (error.message?.includes('unauthorized_client')) {
        toast.error('Configuración de Azure AD pendiente. Usa el botón de desarrollo por ahora.');
      } else {
        toast.error('Error al iniciar sesión con Microsoft');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-gray-900 to-dark-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-16 h-16 bg-gradient-to-r from-dark-primary to-dark-accent rounded-xl flex items-center justify-center mx-auto mb-4"
          >
            <span className="text-dark-bg font-bold text-2xl">F</span>
          </motion.div>
          <h1 className="text-3xl font-bold text-gradient">FinSmart</h1>
          <p className="text-gray-400 mt-2">
            Análisis financiero inteligente con IA
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 glass-effect"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                {isRegister
                  ? 'Únete a FinSmart para analizar tus finanzas'
                  : 'Accede a tu análisis financiero personal'
                }
              </p>
            </div>

            {isRegister && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="input-field pl-10"
                      placeholder="Tu nombre"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Apellido
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="input-field pl-10"
                      placeholder="Tu apellido"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input-field pl-10"
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="input-field pl-10"
                  placeholder="Tu contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="input-field pl-10"
                    placeholder="Confirma tu contraseña"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? 'Cargando...' : (isRegister ? 'Registrarse' : 'Iniciar Sesión')}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  O continuar con
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleMicrosoftLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <img src="/assets/microsoft-logo.svg" alt="Microsoft" className="w-5 h-5 mr-2" />
                Microsoft
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isRegister ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}
              <button
                onClick={() => setIsRegister(!isRegister)}
                className="font-medium text-dark-primary hover:text-dark-accent ml-1"
              >
                {isRegister ? 'Inicia sesión' : 'Regístrate'}
              </button>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
