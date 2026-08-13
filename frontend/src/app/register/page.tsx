'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/modules/auth/services/auth.service';
import { Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import { useToast } from '@/shared/contexts/ToastContext';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';
import { useEffect } from 'react';

const schema = z.object({
  username: z
    .string()
    .min(4, 'Mínimo 4 caracteres')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^\w+$/, 'Solo letras, números y guión bajo'),
  email: z.string()
    .email('Ingresa un correo válido')
    .refine(val => {
      const allowedDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'hotmail.es', 'yahoo.es', 'live.com', 'icloud.com'];
      const domain = val.split('@')[1];
      return allowedDomains.includes(domain?.toLowerCase());
    }, 'Por seguridad, solo aceptamos correos reales (Gmail, Outlook, Hotmail, Yahoo o iCloud)'),
  fullName: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Solo letras y espacios'),
  password: z
    .string()
    .min(6, 'Mínimo 6 caracteres')
    .regex(/[!@#$%^&*(),.?":{}|<>_]/, 'Debe contener al menos un carácter especial (ej. @#$%)'),
  confirmPassword: z.string().min(6, 'Debes confirmar tu contraseña'),
  terms: z.boolean().refine(val => val === true, {
    message: 'Debes aceptar los Términos y Condiciones para registrarte',
  }),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading } = useAuthContext();
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/active-session');
    }
  }, [user, loading, router]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await authService.register(values);
      // En vez de redirigir al login directamente, les informamos que verifiquen su correo
      showToast('Registro exitoso. Por favor revisa la bandeja de entrada de tu correo electrónico (o spam) para verificar tu cuenta antes de iniciar sesión.', 'success');
      setTimeout(() => {
        router.push('/login?registered=true');
      }, 5000);
    } catch (err: any) {
      showToast(err instanceof Error ? err.message : 'Error al registrar la cuenta.', 'error');
    }
  };

  if (loading || user) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center p-6 h-full min-h-[50vh]">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="text-center mb-6 animate-fade-in-right" style={{ animationDelay: '0.2s' }}>
        <h2 className="text-3xl font-bold text-main mb-2">Crear Cuenta</h2>
        <p className="text-muted">Completa los datos para registrarte</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-fade-in-right" style={{ animationDelay: '0.4s' }}>

        {/* Nombre completo + Username */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-semibold text-main mb-2">Nombre Completo</label>
            <input
              {...register('fullName')}
              id="fullName"
              className={`w-full px-4 py-3 border-2 rounded-xl outline-none transition-all text-base ${errors.fullName ? 'border-red-500 bg-red-50' : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                }`}
              placeholder="Darwin P"
            />
            {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>}
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-main mb-2">Nombre de Usuario</label>
            <input
              {...register('username')}
              id="username"
              className={`w-full px-4 py-3 border-2 rounded-xl outline-none transition-all text-base ${errors.username ? 'border-red-500 bg-red-50' : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                }`}
              placeholder="DarwinP"
            />
            {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>}
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-main mb-2">Correo Electrónico</label>
          <input
            {...register('email')}
            id="email"
            type="email"
            className={`w-full px-4 py-3 border-2 rounded-xl outline-none transition-all text-base ${errors.email ? 'border-red-500 bg-red-50' : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
              }`}
            placeholder="javierjacome0w0@gmail.com"
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
        </div>

        {/* Contraseña + Confirmación */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-main mb-2">Contraseña</label>
            <div className="relative">
              <input
                {...register('password')}
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`w-full px-4 py-3 pr-12 border-2 rounded-xl outline-none transition-all text-base ${errors.password ? 'border-red-500 bg-red-50' : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                  }`}
                placeholder="••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-faint hover:text-teal-500 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-main mb-2">Confirmar Contraseña</label>
            <div className="relative">
              <input
                {...register('confirmPassword')}
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                className={`w-full px-4 py-3 pr-12 border-2 rounded-xl outline-none transition-all text-base ${errors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                  }`}
                placeholder="••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-faint hover:text-teal-500 transition-colors focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
          </div>
        </div>

        {/* Términos y condiciones */}
        <div className="flex flex-col mb-4 text-left">
          <label className="flex items-start space-x-3 cursor-pointer">
            <div className="flex-shrink-0 mt-1">
              <input
                type="checkbox"
                {...register('terms')}
                className="w-5 h-5 rounded border-2 border-slate-300 text-teal-600 focus:ring-teal-500/30 transition-all cursor-pointer"
              />
            </div>
            <span className="text-sm text-theme-faint leading-relaxed">
              He leído y acepto los <Link href="/terms" className="text-teal-600 hover:underline font-semibold" target="_blank">Términos y Condiciones</Link> y la <Link href="/privacy" className="text-teal-600 hover:underline font-semibold" target="_blank">Política de Privacidad</Link> de Hoptolt.
            </span>
          </label>
          {errors.terms && <p className="text-red-500 text-sm mt-1 ml-8">{errors.terms.message}</p>}
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
        <p className="text-muted text-sm mb-4">
          ¿Ya tienes una cuenta?{' '}
          º          <Link href="/login" className="text-teal-600 font-semibold hover:underline">
            Inicia Sesión
          </Link>
        </p>
        <div className="flex items-center justify-center gap-3 text-theme-faint text-xs">
          <span>v3.0.0</span>
          <span>•</span>
          <span>© 2025 Hoptolt Ecuador</span>
        </div>
      </div>
    </AuthLayout>
  );
}
