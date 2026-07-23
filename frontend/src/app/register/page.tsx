'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/modules/auth/services/auth.service';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import { useToast } from '@/shared/contexts/ToastContext';

const schema = z.object({
  username: z
    .string()
    .min(4, 'Mínimo 4 caracteres')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^\w+$/, 'Solo letras, números y guión bajo'),
  email: z.string().email('Ingresa un correo válido'),
  fullName: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Solo letras y espacios'),
  password: z
    .string()
    .min(6, 'Mínimo 6 caracteres')
    .regex(/[!@#$%^&*(),.?":{}|<>_]/, 'Debe contener al menos un carácter especial (ej. @#$%)'),
  confirmPassword: z.string().min(6, 'Debes confirmar tu contraseña'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await authService.register(values);
      // Redirigimos a login con un mensaje informativo.
      router.push('/login?registered=true');
    } catch (err: any) {
      showToast(err instanceof Error ? err.message : 'Error al registrar la cuenta.', 'error');
    }
  };


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
              className={`w-full px-4 py-3 border-2 rounded-xl outline-none transition-all text-base ${
                errors.fullName ? 'border-red-500 bg-red-50' : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
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
          <label htmlFor="email" className="block text-sm font-semibold text-main mb-2">Correo Electrónico</label>
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
            <label htmlFor="password" className="block text-sm font-semibold text-main mb-2">Contraseña</label>
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
                className={`w-full px-4 py-3 pr-12 border-2 rounded-xl outline-none transition-all text-base ${
                  errors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
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
          <Link href="/login" className="text-teal-600 font-semibold hover:underline">
            Inicia Sesión
          </Link>
        </p>
        <div className="flex items-center justify-center gap-3 text-theme-faint text-xs">
          <span>v2.0.0</span>
          <span>•</span>
          <span>© 2025 Hoptolt Ecuador</span>
        </div>
      </div>
    </AuthLayout>
  );
}
