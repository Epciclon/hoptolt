'use client';

import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';
import { authService } from '@/modules/auth/services/auth.service';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import { useEffect } from 'react';

export default function ActiveSessionPage() {
  const router = useRouter();
  const { user, refetchUser, loading } = useAuthContext();

  useEffect(() => {
    // If we loaded the auth state and there's no user, fallback to login
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

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
        <div className="flex gap-4 justify-center">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 border-2 border-teal-500 text-teal-600 font-semibold rounded-xl hover:bg-teal-50 transition-colors"
          >
            Ir al Dashboard
          </button>
          <button
            type="button"
            onClick={async () => {
              await authService.logout();
              await refetchUser();
              router.push('/login');
            }}
            className="px-6 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-md hover:-translate-y-0.5"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
