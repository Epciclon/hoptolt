'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/modules/auth/services/auth.service';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';

const schema = z.object({
  identifier: z.string().min(1, 'El usuario o correo es obligatorio.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { refetchUser } = useAuthContext();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setError('');
    try {
      await authService.login(values);
      await refetchUser();
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full animate-bounce" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-32 left-20 w-16 h-16 bg-white/10 rounded-full animate-bounce" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 right-32 w-24 h-24 bg-white/10 rounded-full animate-bounce" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-white/10 rounded-full animate-bounce" style={{ animationDelay: '4s', transform: 'translate(-50%, -50%)' }} />
      </div>

      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex relative z-10 animate-fade-in-up">
        {/* Panel izquierdo — Presentación de la app */}
        <div className="w-1/2 bg-gradient-to-br from-teal-500 to-teal-600 p-12 flex-col justify-center text-white relative overflow-hidden hidden md:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent animate-spin-slow" style={{ animationDuration: '20s' }} />
          <div className="relative z-10">
            {/* Logo */}
            <div className="flex items-center mb-8 animate-fade-in-left">
              <div className="w-16 h-16 mr-5 animate-bounce-slow">
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                  <circle cx="50" cy="35" r="15" fill="currentColor" opacity="0.8" />
                  <ellipse cx="42" cy="28" rx="4" ry="8" fill="currentColor" />
                  <ellipse cx="58" cy="28" rx="4" ry="8" fill="currentColor" />
                  <circle cx="45" cy="32" r="2" fill="white" />
                  <circle cx="55" cy="32" r="2" fill="white" />
                  <ellipse cx="50" cy="65" rx="20" ry="25" fill="currentColor" opacity="0.9" />
                  <circle cx="30" cy="85" r="8" fill="currentColor" opacity="0.7" />
                  <circle cx="70" cy="85" r="8" fill="currentColor" opacity="0.7" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold drop-shadow-md">Hoptolt</h1>
            </div>

            <h2 className="text-2xl font-semibold mb-4 animate-fade-in-left" style={{ animationDelay: '0.2s' }}>
              Sistema de Gestión de Conejos
            </h2>
            <p className="text-lg md:text-xl font-medium mb-8 text-teal-50 animate-fade-in-left leading-relaxed" style={{ animationDelay: '0.4s' }}>
              Plataforma para la gestión de criaderos de conejos, control de alimentación, vacunación, partos y reportes.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '📋', label: 'Gestión de Galpones' },
                { icon: '💉', label: 'Control y Sanidad' },
                { icon: '📊', label: 'Reportes Básicos' },
                { icon: '👥', label: 'Gestión de Trabajadores' },
              ].map(({ icon, label }, i) => (
                <div
                  key={label}
                  className="flex items-center p-4 bg-white/10 rounded-xl backdrop-blur-sm hover:bg-white/20 transition-all animate-fade-in-up"
                  style={{ animationDelay: `${0.8 + i * 0.1}s` }}
                >
                  <span className="text-2xl mr-3">{icon}</span>
                  <span className="font-semibold text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel derecho — Formulario de login */}
        <div className="w-full md:w-1/2 p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <div className="text-center mb-8 animate-fade-in-right" style={{ animationDelay: '0.2s' }}>
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Iniciar Sesión</h2>
              <p className="text-slate-500">Acceda a su cuenta para continuar</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fade-in-right" style={{ animationDelay: '0.4s' }}>
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-600">
                  <span className="text-xl mr-3">⚠️</span>
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Usuario o Email */}
              <div>
                <label htmlFor="identifier" className="block text-sm font-semibold text-slate-700 mb-2">
                  Usuario o Correo Electrónico
                </label>
                <input
                  {...register('identifier')}
                  type="text"
                  id="identifier"
                  className={`w-full px-4 py-4 border-2 rounded-xl outline-none transition-all ${errors.identifier
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                    }`}
                  placeholder="Ingrese su usuario o correo"
                  autoComplete="username"
                />
                {errors.identifier && (
                  <p className="text-red-500 text-sm mt-1">{errors.identifier.message}</p>
                )}
              </div>

              {/* Contraseña */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">Contraseña</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    className={`w-full px-4 py-4 pr-12 border-2 rounded-xl outline-none transition-all ${errors.password
                        ? 'border-red-500 bg-red-50'
                        : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                      }`}
                    placeholder="Ingrese su contraseña"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-500 transition-colors"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.09L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.76,7.13 11.37,7 12,7Z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                id="btn-login"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none mt-4 relative overflow-hidden"
              >
                <span className="flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2Z" />
                      </svg>
                      Iniciar Sesión
                    </>
                  )}
                </span>
              </button>
            </form>

            <div className="mt-8 text-center animate-fade-in-right" style={{ animationDelay: '0.8s' }}>
              <p className="text-slate-600 text-sm mb-4">
                ¿No tienes una cuenta?{' '}
                <Link href="/register" className="text-teal-600 font-semibold hover:underline">
                  Regístrate aquí
                </Link>
              </p>
              <div className="flex items-center justify-center gap-3 text-slate-400 text-xs">
                <span>v2.0.0</span>
                <span>•</span>
                <span>© 2025 Hoptolt Ecuador</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-left {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade-in-right {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce-slow {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          60% { transform: translateY(-5px); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out; }
        .animate-fade-in-left { animation: fade-in-left 1s ease-out; }
        .animate-fade-in-right { animation: fade-in-right 1s ease-out; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
