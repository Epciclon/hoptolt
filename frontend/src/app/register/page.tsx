'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/modules/auth/services/auth.service';
import { Eye, EyeOff } from 'lucide-react';

const schema = z.object({
  username: z
    .string()
    .min(4, 'Mínimo 4 caracteres')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guión bajo'),
  email: z.string().email('Ingresa un correo válido'),
  fullName: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Solo letras y espacios'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string().min(6, 'Debes confirmar tu contraseña'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setError('');
    try {
      await authService.register(values);
      // Redirigimos a login con un mensaje informativo.
      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Error al registrar la cuenta.');
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
        <div className="w-1/2 bg-gradient-to-br from-teal-500 to-teal-600 p-10 flex-col justify-center text-white relative overflow-hidden hidden md:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent animate-spin-slow" style={{ animationDuration: '20s' }} />
          <div className="relative z-10">
            {/* Logo */}
            <div className="flex items-center mb-6 animate-fade-in-left">
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
              Únete a nosotros
            </h2>
            <p className="text-lg md:text-xl font-medium mb-8 text-teal-50 animate-fade-in-left leading-relaxed" style={{ animationDelay: '0.4s' }}>
              Crea tu cuenta para gestionar galpones y jaulas, llevar el control de alimentación y sanidad de tus conejos, y consultar reportes básicos.
            </p>

            <div className="space-y-3 animate-fade-in-left text-sm" style={{ animationDelay: '0.6s' }}>
              {[
                '✅ Gestión de galpones y jaulas',
                '✅ Control de alimentación y sanidad',
                '✅ Reportes básicos',
                '✅ Gestión de trabajadores',
              ].map((item) => (
                <p key={item} className="opacity-95 font-semibold flex items-center gap-1.5">{item}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Panel derecho — Formulario */}
        <div className="w-full md:w-1/2 p-10 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <div className="text-center mb-6 animate-fade-in-right" style={{ animationDelay: '0.2s' }}>
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Crear Cuenta</h2>
              <p className="text-slate-500">Completa los datos para registrarte</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-fade-in-right" style={{ animationDelay: '0.4s' }}>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-600">
                  <span className="text-xl mr-3">⚠️</span>
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Nombre completo + Username */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre Completo</label>
                  <input
                    {...register('fullName')}
                    id="fullName"
                    className={`w-full px-4 py-3 border-2 rounded-xl outline-none transition-all text-base ${
                      errors.fullName ? 'border-red-500 bg-red-50' : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                    }`}
                    placeholder="Darwin P"
                  />
                  {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre de Usuario</label>
                  <input
                    {...register('username')}
                    id="username"
                    className={`w-full px-4 py-3 border-2 rounded-xl outline-none transition-all text-base ${
                      errors.username ? 'border-red-500 bg-red-50' : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                    }`}
                    placeholder="DarwinP"
                  />
                  {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Correo Electrónico</label>
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  className={`w-full px-4 py-3 border-2 rounded-xl outline-none transition-all text-base ${
                    errors.email ? 'border-red-500 bg-red-50' : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                  }`}
                  placeholder="javierjacome0w0@gmail.com"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
              </div>

              {/* Contraseña + Confirmación */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Contraseña</label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className={`w-full px-4 py-3 pr-12 border-2 rounded-xl outline-none transition-all text-base ${
                        errors.password ? 'border-red-500 bg-red-50' : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                      }`}
                      placeholder="••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-500 transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Confirmar Contraseña</label>
                  <div className="relative">
                    <input
                      {...register('confirmPassword')}
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`w-full px-4 py-3 pr-12 border-2 rounded-xl outline-none transition-all text-base ${
                        errors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                      }`}
                      placeholder="••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-500 transition-colors focus:outline-none"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
                </div>
              </div>

              <button
                type="submit"
                id="btn-register"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-4"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creando cuenta...
                  </span>
                ) : (
                  'Crear Cuenta'
                )}
              </button>
            </form>

            <div className="mt-6 text-center animate-fade-in-right" style={{ animationDelay: '0.8s' }}>
              <p className="text-slate-600 text-sm mb-4">
                ¿Ya tienes una cuenta?{' '}
                <Link href="/login" className="text-teal-600 font-semibold hover:underline">
                  Inicia Sesión
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
