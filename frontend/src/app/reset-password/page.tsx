'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/modules/auth/services/auth.service';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import { useToast } from '@/shared/contexts/ToastContext';
import { createClient } from '@/utils/supabase/client';

const schema = z
  .object({
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
    confirmPassword: z.string().min(6, 'La confirmación debe tener al menos 6 caracteres.'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash || '';
    const search = window.location.search || '';

    // 1. Detectar errores de enlace expirado en el hash o en search reportados por Supabase
    if (hash.includes('error=')) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
      setErrorMessage(
        hashParams.get('error_description') ||
        hashParams.get('error') ||
        'El enlace de recuperación es inválido o ha expirado.'
      );
      setIsVerifying(false);
      setIsReady(false);
      return;
    }

    if (search.includes('error=')) {
      const searchParams = new URLSearchParams(search);
      setErrorMessage(
        searchParams.get('error_description') ||
        searchParams.get('error') ||
        'El enlace de recuperación es inválido o ha expirado.'
      );
      setIsVerifying(false);
      setIsReady(false);
      return;
    }

    const supabase = createClient();

    // 2. Si viene con código PKCE (?code=...)
    const params = new URLSearchParams(search);
    const code = params.get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then((result: { error: { message?: string } | null }) => {
        if (result.error) {
          setErrorMessage(result.error.message || 'Código de recuperación inválido o expirado.');
          setIsReady(false);
        } else {
          setIsReady(true);
        }
        setIsVerifying(false);
      });
      return;
    }

    // 3. Escuchar evento oficial PASSWORD_RECOVERY o sesión iniciada por el token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: unknown) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && Boolean(session))) {
        setIsReady(true);
        setIsVerifying(false);
      }
    });

    // 4. Verificar si Supabase ya estableció la sesión a partir del hash
    supabase.auth.getSession().then((res: { data: { session: unknown } }) => {
      const session = res.data.session;
      if (session) {
        setIsReady(true);
        setIsVerifying(false);
      } else {
        // Si tras breve espera no hay sesión ni token, marcar como enlace inválido
        setTimeout(() => {
          setIsReady((currentReady) => {
            if (!currentReady) {
              setErrorMessage(
                'No se encontró un enlace de recuperación válido. Para restablecer tu contraseña, solicita un enlace desde la página de recuperación.'
              );
              setIsVerifying(false);
            }
            return currentReady;
          });
        }, 1200);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await authService.resetPassword(values.password);
      // Cerrar sesión en Supabase y limpiar almacenamiento local
      const supabase = createClient();
      await supabase.auth.signOut().catch(() => {});
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('hoptolt_session_initialized');
        sessionStorage.removeItem('hoptolt_last_feeding_popup_time');
      }

      showToast('¡Contraseña restablecida exitosamente! Ya puedes iniciar sesión.', 'success');
      router.push('/login');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar la contraseña.';
      showToast(msg, 'error');
      setErrorMessage(msg);
      setIsReady(false);
    }
  };

  return (
    <AuthLayout>
      <div className="text-center mb-8 animate-fade-in-right" style={{ animationDelay: '0.2s' }}>
        <h2 className="text-3xl font-bold text-main mb-2">Nueva Contraseña</h2>
        <p className="text-muted">Crea una nueva contraseña segura para tu cuenta</p>
      </div>

      {isVerifying ? (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted">Verificando enlace de recuperación...</p>
        </div>
      ) : isReady ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fade-in-right" style={{ animationDelay: '0.4s' }}>
          {/* Nueva Contraseña */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-main mb-2">
              Nueva Contraseña
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                id="password"
                className={`w-full px-4 py-4 pr-12 border-2 rounded-xl outline-none transition-all ${
                  errors.password
                    ? 'border-red-500 bg-red-50 dark:bg-red-500/10'
                    : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                }`}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                autoFocus
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
                    <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.09L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.76,7.13 11.37,7 12,7Z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Confirmar Contraseña */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-main mb-2">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <input
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                className={`w-full px-4 py-4 pr-12 border-2 rounded-xl outline-none transition-all ${
                  errors.confirmPassword
                    ? 'border-red-500 bg-red-50 dark:bg-red-500/10'
                    : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                }`}
                placeholder="Repite la contraseña"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-faint hover:text-teal-500 transition-colors"
                aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.09L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.76,7.13 11.37,7 12,7Z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.09L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.76,7.13 11.37,7 12,7Z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            id="btn-update-password"
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Actualizando contraseña...
              </span>
            ) : (
              'Guardar Nueva Contraseña'
            )}
          </button>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="text-sm text-teal-600 dark:text-teal-400 font-semibold hover:underline inline-flex items-center gap-1"
            >
              ← Cancelar y volver al login
            </Link>
          </div>
        </form>
      ) : (
        <div className="space-y-6 animate-fade-in-right">
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-main mb-2">Enlace inválido o expirado</h3>
            <p className="text-sm text-muted leading-relaxed">
              {errorMessage || 'El enlace para restablecer tu contraseña no es válido, ya fue utilizado o ha expirado.'}
            </p>
          </div>

          <Link
            href="/forgot-password"
            className="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
          >
            Solicitar un nuevo enlace
          </Link>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="text-sm text-teal-600 dark:text-teal-400 font-semibold hover:underline inline-flex items-center gap-1"
            >
              ← Volver al inicio de sesión
            </Link>
          </div>
        </div>
      )}

      <div className="mt-8 text-center animate-fade-in-right" style={{ animationDelay: '0.8s' }}>
        <div className="flex items-center justify-center gap-3 text-theme-faint text-xs">
          <span>v3.0.0</span>
          <span>•</span>
          <span>© 2025 Hoptolt Ecuador</span>
        </div>
      </div>
    </AuthLayout>
  );
}
