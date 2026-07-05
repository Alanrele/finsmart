import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import { useMicrosoftAuth } from '../hooks/useMicrosoftAuth';
import { loginUser, registerUser } from '../services/api';
import BrandLogo, { KipuIcon } from '../components/common/BrandLogo';

/* Ilustración de marca: hebras del quipu colgando con nudos a distintas alturas */
const QuipuStrands = ({ className = '' }) => (
  <svg viewBox="0 0 320 220" className={className} aria-hidden="true" fill="none">
    <path d="M10 24 Q160 44 310 24" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
    {[
      { x: 40, len: 120, knots: [70, 108], c: '#D4CBB0' },
      { x: 92, len: 168, knots: [88], c: '#A6C0B4' },
      { x: 144, len: 96, knots: [62, 84], c: '#D4CBB0' },
      { x: 196, len: 184, knots: [96, 150], c: '#A6C0B4' },
      { x: 248, len: 140, knots: [110], c: '#D4CBB0' },
      { x: 288, len: 76, knots: [58], c: '#A6C0B4' },
    ].map(({ x, len, knots, c }) => (
      <g key={x}>
        <line
          x1={x} y1={30} x2={x} y2={30 + len}
          stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="4" strokeLinecap="round"
        />
        {knots.map(k => <circle key={k} cx={x} cy={k} r="7" fill={c} />)}
      </g>
    ))}
  </svg>
);

const Login = () => {
  const navigate = useNavigate();
  const { login, setLoading, isLoading } = useAuthStore();
  const { loginMicrosoft } = useMicrosoftAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    confirmPassword: ''
  });

  const validateField = (name, value, data = formData) => {
    switch (name) {
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Escribe un correo válido';
        return '';
      case 'password':
        if (value && value.length < 6) return 'Mínimo 6 caracteres';
        return '';
      case 'confirmPassword':
        if (isRegister && value && value !== data.password) return 'Las contraseñas no coinciden';
        return '';
      default:
        return '';
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const next = { ...formData, [name]: value };
    setFormData(next);
    if (errors[name]) {
      setErrors({ ...errors, [name]: validateField(name, value, next) });
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setErrors({ ...errors, [name]: validateField(name, value) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = {
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
      confirmPassword: validateField('confirmPassword', formData.confirmPassword)
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

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

  const inputClass = (name) =>
    `input-field input-field--with-prefix-icon ${
      errors[name]
        ? 'border-red-300 dark:border-red-800 focus:ring-red-500/20 focus:border-red-400'
        : ''
    }`;

  const fieldError = (name) =>
    errors[name] ? (
      <p className="mt-1.5 text-xs font-semibold text-red-500" role="alert">{errors[name]}</p>
    ) : null;

  return (
    <div className="min-h-screen bg-page dark:bg-page-dark lg:grid lg:grid-cols-[1.05fr_1fr]">

      {/* Panel de marca (escritorio) */}
      <motion.aside
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="hidden lg:flex flex-col justify-between bg-gradient-to-b from-primary-900 to-primary-700 p-12 overflow-hidden"
      >
        <BrandLogo iconSize={40} textClassName="text-2xl text-white" />

        <div className="max-w-md">
          <h1 className="text-[44px] leading-[1.05] font-bold text-white tracking-tight">
            Cada sol,
            <br />
            <span className="text-sand">anudado y en orden.</span>
          </h1>
          <p className="mt-5 text-primary-100 text-sm font-medium leading-relaxed">
            Kipu lee las notificaciones del BCP en tu correo y las convierte en un
            registro claro: gastos, ingresos y tendencias, sin que muevas un dedo.
          </p>
          <QuipuStrands className="mt-10 w-full max-w-sm motion-reduce:animate-none" />
        </div>

        <p className="text-[11px] font-extrabold uppercase tracking-wider text-primary-200">
          Como un quipu: tus cuentas, nudo por nudo
        </p>
      </motion.aside>

      {/* Columna de formulario */}
      <div className="flex flex-col min-h-screen lg:min-h-0">

        {/* Encabezado compacto (móvil) */}
        <div className="lg:hidden bg-gradient-to-b from-primary-900 to-primary-700 px-6 pt-10 pb-8 safe-area-top">
          <BrandLogo iconSize={36} textClassName="text-xl text-white" />
          <p className="mt-3 text-sm font-medium text-primary-100">
            Tus movimientos del BCP, anudados y en orden.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex items-center justify-center px-4 py-10 sm:px-8"
        >
          <div className="w-full max-w-md">
            <div className="mb-8">
              <span className="eyebrow">{isRegister ? 'Nueva cuenta' : 'Bienvenido de vuelta'}</span>
              <h2 className="mt-2 text-[32px] font-bold tracking-tight leading-tight text-zinc-900 dark:text-zinc-50">
                {isRegister ? 'Crea tu cuenta' : 'Inicia sesión'}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {isRegister
                  ? 'Empieza a ordenar tus finanzas en minutos'
                  : 'Accede a tu registro financiero personal'
                }
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {isRegister && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="micro-label block mb-2">
                      Nombre
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        className="input-field input-field--with-prefix-icon"
                        placeholder="Tu nombre"
                        autoComplete="given-name"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="lastName" className="micro-label block mb-2">
                      Apellido
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        className="input-field input-field--with-prefix-icon"
                        placeholder="Tu apellido"
                        autoComplete="family-name"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="micro-label block mb-2">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    disabled={isLoading}
                    className={inputClass('email')}
                    placeholder="tu@email.com"
                    autoComplete="email"
                    required
                  />
                </div>
                {fieldError('email')}
              </div>

              <div>
                <label htmlFor="password" className="micro-label block mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    disabled={isLoading}
                    className={`${inputClass('password')} input-field--with-suffix-icon`}
                    placeholder="Tu contraseña"
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-primary hover:bg-primary/10 transition"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldError('password')}
              </div>

              {isRegister && (
                <div>
                  <label htmlFor="confirmPassword" className="micro-label block mb-2">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      disabled={isLoading}
                      className={inputClass('confirmPassword')}
                      placeholder="Repite tu contraseña"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  {fieldError('confirmPassword')}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full active:scale-[0.99]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
                    {isRegister ? 'Creando cuenta…' : 'Entrando…'}
                  </>
                ) : (
                  isRegister ? 'Crear cuenta' : 'Iniciar sesión'
                )}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-page dark:bg-page-dark text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                    O continúa con
                  </span>
                </div>
              </div>

              <button
                onClick={handleMicrosoftLogin}
                disabled={isLoading}
                className="mt-5 w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 text-sm font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition disabled:opacity-50"
              >
                <img src="/microsoft-logo.svg" alt="" className="w-4 h-4" />
                Microsoft
              </button>
            </div>

            <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {isRegister ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}
              <button
                onClick={() => { setIsRegister(!isRegister); setErrors({}); }}
                className="font-bold text-primary hover:text-primary-600 dark:text-primary-300 ml-1.5 transition"
              >
                {isRegister ? 'Inicia sesión' : 'Regístrate'}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
