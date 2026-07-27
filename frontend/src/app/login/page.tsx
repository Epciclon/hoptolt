'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/modules/auth/services/auth.service';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import { useToast } from '@/shared/contexts/ToastContext';

const schema = z.object({
  identifier: z.string().min(1, 'El usuario o correo es obligatorio.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { refetchUser } = useAuthContext();
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await authService.login(values);
      await refetchUser();
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al iniciar sesión.', 'error');
    }
  };

  return (
    <AuthLayout>
      <div className="text-center mb-8 animate-fade-in-right" style={{ animationDelay: '0.2s' }}>
        <h2 className="text-3xl font-bold text-main mb-2">Iniciar Sesión</h2>
        <p className="text-muted">Acceda a su cuenta para continuar</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fade-in-right" style={{ animationDelay: '0.4s' }}>

        {/* Usuario o Email */}
        <div>
          <label htmlFor="identifier" className="block text-sm font-semibold text-main mb-2">
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
          <label htmlFor="password" className="block text-sm font-semibold text-main mb-2">Contraseña</label>
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
              className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-faint hover:text-teal-500 transition-colors"
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
        <p className="text-muted text-sm mb-4">
          ¿No tienes una cuenta?{' '}
          <Link href="/register" className="text-teal-600 font-semibold hover:underline">
            Regístrate aquí
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
