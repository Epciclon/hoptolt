'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/modules/auth/services/auth.service';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import { useToast } from '@/shared/contexts/ToastContext';
import { translateAuthError } from '@/modules/auth/utils/auth-errors';

const schema = z.object({
  identifier: z.string().min(1, 'El usuario o correo electrónico es obligatorio.'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { user, loading } = useAuthContext();
  const { showToast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);
  const [sentIdentifier, setSentIdentifier] = useState('');

  useEffect(() => {
    if (!loading && user) {
      router.replace('/active-session');
    }
  }, [user, loading, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await authService.requestPasswordReset(values.identifier);
      setSentIdentifier(values.identifier);
      setIsSuccess(true);
      showToast('Enlace de recuperación enviado correctamente.', 'success');
    } catch (err) {
      showToast(translateAuthError(err), 'error');
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
      <div className="text-center mb-8 animate-fade-in-right" style={{ animationDelay: '0.2s' }}>
        <h2 className="text-3xl font-bold text-main mb-2">Recuperar Contraseña</h2>
        <p className="text-muted">
          {isSuccess
            ? 'Revisa tu bandeja de entrada'
            : 'Ingresa tu usuario o correo para recibir el enlace de recuperación'}
        </p>
      </div>

      {isSuccess ? (
        <div className="space-y-6 animate-fade-in-right" style={{ animationDelay: '0.4s' }}>
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-main mb-2">¡Correo de recuperación enviado!</h3>
            <p className="text-sm text-muted leading-relaxed">
              Hemos enviado las instrucciones para restablecer tu contraseña a la dirección asociada a{' '}
              <strong className="text-main">{sentIdentifier}</strong>.
            </p>
            <p className="text-xs text-theme-faint mt-3">
              Por favor revisa tu bandeja de entrada y la carpeta de correo no deseado (Spam).
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/login"
              className="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              Volver a Iniciar Sesión
            </Link>

            <button
              type="button"
              onClick={() => setIsSuccess(false)}
              className="w-full py-3 text-sm text-muted hover:text-main transition-colors text-center"
            >
              Intentar con otro correo o usuario
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fade-in-right" style={{ animationDelay: '0.4s' }}>
          <div>
            <label htmlFor="identifier" className="block text-sm font-semibold text-main mb-2">
              Usuario o Correo Electrónico
            </label>
            <input
              {...register('identifier')}
              type="text"
              id="identifier"
              className={`w-full px-4 py-4 border-2 rounded-xl outline-none transition-all ${
                errors.identifier
                  ? 'border-red-500 bg-red-50 dark:bg-red-500/10'
                  : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
              }`}
              placeholder="Ingrese su usuario o correo"
              autoComplete="email"
              autoFocus
            />
            {errors.identifier && (
              <p className="text-red-500 text-sm mt-1">{errors.identifier.message}</p>
            )}
          </div>

          <button
            type="submit"
            id="btn-recover"
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enviando enlace...
              </span>
            ) : (
              'Enviar Enlace de Recuperación'
            )}
          </button>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="text-sm text-teal-600 dark:text-teal-400 font-semibold hover:underline inline-flex items-center gap-1"
            >
              ← Volver al inicio de sesión
            </Link>
          </div>
        </form>
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
