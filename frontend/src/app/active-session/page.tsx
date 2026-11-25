'use client';

import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';
import { authService } from '@/modules/auth/services/auth.service';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import { useEffect, useState } from 'react';

export default function ActiveSessionPage() {
  const router = useRouter();
  const { user, refetchUser, loading } = useAuthContext();
  const [activeAction, setActiveAction] = useState<'dashboard' | 'logout' | null>(null);
  const isBusy = activeAction !== null;

  useEffect(() => {
    // If we loaded the auth state and there's no user, fallback to login
    if (!loading && !user && !isBusy) {
      router.replace('/login');
    }
  }, [user, loading, router, isBusy]);

  const handleGoToDashboard = () => {
    if (isBusy) return;
    setActiveAction('dashboard');
    router.push('/dashboard');
  };

  const handleLogout = async () => {
    if (isBusy) return;
    setActiveAction('logout');
    try {
      await authService.logout();
      await refetchUser();
      router.push('/login');
    } catch {
      setActiveAction(null);
    }
  };

  if (loading || !user) {
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
      <div className="text-center animate-fade-in-right p-6">
        <h2 className="text-3xl font-bold text-main mb-6">Confirmar</h2>
        <p className="text-muted mb-8 text-lg leading-relaxed">
          Actualmente ha iniciado sesión como <span className="font-semibold text-main uppercase">{user.fullName || user.email}</span>, necesita salir antes de volver a entrar con un usuario diferente.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <button
            type="button"
            disabled={isBusy}
            onClick={handleGoToDashboard}
            className="px-6 py-3 border-2 border-teal-500 text-teal-600 dark:text-teal-400 font-semibold rounded-xl hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {activeAction === 'dashboard' ? 'Ingresando...' : 'Ir al Dashboard'}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={handleLogout}
            className="px-6 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-md hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            {activeAction === 'logout' && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {activeAction === 'logout' ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
