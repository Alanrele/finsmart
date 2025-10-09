import React, { useState } from 'react'
im        const data        // Login
        const data = await loginUser({
          email: formData.email,
          password: formData.password
        });

        login(data.user, data.token);t registerUser({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName
        });

        login(data.user, data.token);otion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Mail, Lock, User, Smartphone } from 'lucide-react'
import useAuthStore from '../stores/authStore'
import { useMicrosoftAuth } from '../hooks/useMicrosoftAuth'
import { loginUser, registerUser } from '../services/api';

const Login = () => {
  const navigate = useNavigate()
  const { login, setLoading, isLoading } = useAuthStore()
  const { loginMicrosoft } = useMicrosoftAuth()

  const [isRegister, setIsRegister] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    confirmPassword: ''
  })

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isRegister) {
        // Registration
        if (formData.password !== formData.confirmPassword) {
          toast.error('Las contraseñas no coinciden')
          return
        }

        const response = await authAPI.register({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName
        })

        login(response.data.user, response.data.token)
        toast.success('Cuenta creada exitosamente')
        navigate('/dashboard')
      } else {
        // Login
        const response = await authAPI.login({
          email: formData.email,
          password: formData.password
        })

        login(response.data.user, response.data.token)
        toast.success('Inicio de sesión exitoso')
        navigate('/dashboard')
      }
    } catch (error) {
      toast.error(error.message || 'An unknown error occurred');
    } finally {
      setLoading(false)
    }
  }

  const handleMicrosoftLogin = async () => {
    setLoading(true)

    try {
      // This will redirect to Microsoft login page
      await loginMicrosoft()
      // Note: Code after this won't execute as page redirects
      // The callback will be handled by AuthCallback component
    } catch (error) {
      console.error('Microsoft login error:', error)
      if (error.message?.includes('unauthorized_client')) {
        toast.error('Configuración de Azure AD pendiente. Usa el botón de desarrollo por ahora.')
      } else {
        toast.error('Error al iniciar sesión con Microsoft')
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-gray-900 to-dark-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
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

        {/* Form */}
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

            {/* Registration fields */}
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

            {/* Email */}
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

            {/* Password */}
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
                  className="input-field pl-10 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Register only) */}
            {isRegister && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="input-field pl-10"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <div className="loading-spinner w-5 h-5" />
              ) : (
                <>
                  <Smartphone className="w-5 h-5" />
                  <span>{isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}</span>
                </>
              )}
            </motion.button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">o</span>
              </div>
            </div>

            {/* Development Login Button */}
            {import.meta.env.DEV && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={async () => {
                  try {
                    setLoading(true)
                    // Simulate demo user login
                    const demoUser = {
                      _id: 'demo-user-id',
                      firstName: 'Demo',
                      lastName: 'User',
                      email: 'demo@finsmart.com',
                      avatar: null
                    }
                    const demoToken = 'demo-token-for-development'

                    login(demoUser, demoToken)
                    toast.success('Sesión de desarrollo iniciada')
                    navigate('/dashboard')
                  } catch (error) {
                    toast.error('Error en login de desarrollo')
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 mb-3"
              >
                <span>🚀 Acceso de Desarrollo</span>
              </motion.button>
            )}

            {/* Microsoft Login */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleMicrosoftLogin}
              disabled={isLoading}
              className="w-full btn-secondary flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 23 23">
                <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              <span>Continuar con Microsoft</span>
            </motion.button>

            {/* Toggle mode */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="text-dark-primary hover:text-dark-accent font-medium"
              >
                {isRegister
                  ? '¿Ya tienes cuenta? Inicia sesión'
                  : '¿No tienes cuenta? Regístrate'
                }
              </button>
            </div>
          </form>
        </motion.div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-400 text-sm">
          <p>&copy; 2024 FinSmart. Análisis financiero seguro y privado.</p>
        </div>
      </motion.div>
    </div>
  )
}

export default Login
