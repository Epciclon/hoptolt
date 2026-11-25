'use client';

import { useState, useEffect } from 'react';
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
import { APP_VERSION, APP_COPYRIGHT } from '@/lib/constants';

const schema = z.object({
  username: z
    .string()
    .min(4, 'Mínimo 4 caracteres')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^\w+$/, 'Solo letras, números y guión bajo'),
  email: z.string()
    .email('Ingresa un correo válido'),
  fullName: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Solo letras y espacios'),
  password: z
    .string()
    .min(6, 'Mínimo 6 caracteres')
    .regex(/\d/, 'Debe contener al menos un número')
    .regex(/[!@#$%^&*(),.?":{}|<>_]/, 'Debe contener al menos un carácter especial como @#$%'),
  confirmPassword: z.string().min(6, 'Debes confirmar tu contraseña'),
  terms: z.boolean().refine(val => val === true, {
    message: 'Debes aceptar los Términos y Condiciones para registrarte',
  }),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type FormValues = z.infer<typeof schema>;

function getInputClassName(hasError: boolean, extraPadding = ''): string {
  const stateClasses = hasError
    ? 'border-red-500 bg-red-50 dark:bg-red-500/10'
    : 'border-slate-300 dark:border-slate-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';
  return `w-full px-4 py-3 ${extraPadding} border-2 rounded-xl outline-none transition-all text-base bg-theme-surface dark:bg-slate-900 text-main dark:text-slate-100 ${stateClasses}`;
}

interface RegisterTextFieldProps {
  id: 'fullName' | 'username' | 'email';
  label: string;
  placeholder: string;
  type?: 'text' | 'email';
  registration: ReturnType<ReturnType<typeof useForm<FormValues>>['register']>;
  errorMessage?: string;
}

function RegisterTextField({
  id,
  label,
  placeholder,
  type = 'text',
  registration,
  errorMessage,
}: Readonly<RegisterTextFieldProps>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-main mb-2">{label}</label>
      <input
        {...registration}
        id={id}
        type={type}
        className={getInputClassName(Boolean(errorMessage))}
        placeholder={placeholder}
      />
      {errorMessage && <p className="text-red-500 text-sm mt-1">{errorMessage}</p>}
    </div>
  );
}

interface RegisterPasswordFieldProps {
  id: 'password' | 'confirmPassword';
  label: string;
  visible: boolean;
  onToggleVisibility: () => void;
  registration: ReturnType<ReturnType<typeof useForm<FormValues>>['register']>;
  errorMessage?: string;
}

function RegisterPasswordField({
  id,
  label,
  visible,
  onToggleVisibility,
  registration,
  errorMessage,
}: Readonly<RegisterPasswordFieldProps>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-main mb-2">{label}</label>
      <div className="relative">
        <input
          {...registration}
          id={id}
          type={visible ? 'text' : 'password'}
          className={getInputClassName(Boolean(errorMessage), 'pr-12')}
          placeholder="••••••"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-faint hover:text-teal-500 transition-colors focus:outline-none"
        >
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      {errorMessage && <p className="text-red-500 text-sm mt-1">{errorMessage}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading } = useAuthContext();
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && user && !isRedirecting) {
      router.replace('/active-session');
    }
  }, [user, loading, router, isRedirecting]);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const termsAccepted = watch('terms');
  const isBusy = isSubmitting || isRedirecting;
  const busyText = isRedirecting ? 'Redirigiendo...' : 'Creando cuenta...';
  const submitButtonStyle = termsAccepted
    ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:shadow-lg hover:-translate-y-0.5'
    : 'bg-slate-300 text-slate-500 dark:bg-slate-700 dark:text-slate-400';

  const onSubmit = async (values: FormValues) => {
    if (isBusy) return;
    try {
      await authService.register(values);
      setIsRedirecting(true);
      // En vez de redirigir al login directamente, les informamos que verifiquen su correo
      showToast('Registro exitoso. Por favor revisa la bandeja de entrada de tu correo electrónico (o spam) para verificar tu cuenta antes de iniciar sesión.', 'success');
      setTimeout(() => {
        router.push('/login?registered=true');
      }, 5000);
    } catch (err: any) {
      setIsRedirecting(false);
      showToast(err instanceof Error ? err.message : 'Error al registrar la cuenta.', 'error');
    }
  };

  if ((loading || user) && !isRedirecting) {
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
          <RegisterTextField
            id="fullName"
            label="Nombre Completo"
            placeholder="Darwin P"
            registration={register('fullName')}
            errorMessage={errors.fullName?.message}
          />
          <RegisterTextField
            id="username"
            label="Nombre de Usuario"
            placeholder="DarwinP"
            registration={register('username')}
            errorMessage={errors.username?.message}
          />
        </div>

        {/* Email */}
        <RegisterTextField
          id="email"
          label="Correo Electrónico"
          type="email"
          placeholder="javierjacome0w0@gmail.com"
          registration={register('email')}
          errorMessage={errors.email?.message}
        />

        {/* Contraseña + Confirmación */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RegisterPasswordField
            id="password"
            label="Contraseña"
            visible={showPassword}
            onToggleVisibility={() => setShowPassword(!showPassword)}
            registration={register('password')}
            errorMessage={errors.password?.message}
          />
          <RegisterPasswordField
            id="confirmPassword"
            label="Confirmar Contraseña"
            visible={showConfirmPassword}
            onToggleVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
            registration={register('confirmPassword')}
            errorMessage={errors.confirmPassword?.message}
          />
        </div>

        {/* Términos y condiciones */}
        <div className="flex flex-col mb-4 text-left">
          <label className="flex items-start space-x-3 cursor-pointer">
            <div className="flex-shrink-0 mt-1">
              <input
                type="checkbox"
                disabled={isBusy}
                {...register('terms')}
                className="w-5 h-5 rounded border-2 border-slate-300 text-teal-600 focus:ring-teal-500/30 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
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
          disabled={isBusy || !termsAccepted}
          className={`w-full py-3 font-semibold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-4 ${submitButtonStyle}`}
        >
          {isBusy ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {busyText}
            </span>
          ) : (
            'Crear Cuenta'
          )}
        </button>
      </form>

      <div className="mt-6 text-center animate-fade-in-right" style={{ animationDelay: '0.8s' }}>
        <p className="text-muted text-sm mb-4 flex flex-wrap items-center justify-center gap-1">
          <span>¿Ya tienes una cuenta?</span>
          <Link
            href="/login"
            aria-disabled={isBusy}
            tabIndex={isBusy ? -1 : undefined}
            className={`text-teal-600 font-semibold hover:underline whitespace-nowrap ${isBusy ? 'pointer-events-none opacity-60' : ''}`}
          >
            Inicia Sesión
          </Link>
        </p>
        <div className="flex items-center justify-center gap-3 text-theme-faint text-xs">
          <span>v{APP_VERSION}</span>
          <span>•</span>
          <span>{APP_COPYRIGHT}</span>
        </div>
      </div>
    </AuthLayout>
  );
}
