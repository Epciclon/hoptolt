'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  const router = useRouter();

  useEffect(() => {
    console.error('[Dashboard Error]', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={36} className="text-red-400" />
        </div>
        <h1 className="text-5xl font-bold text-red-400 mb-2">500</h1>
        <h2 className="text-xl font-semibold text-main mb-3">Algo salió mal</h2>
        <p className="text-base text-muted mb-2">
          {error.message || 'Ocurrió un error inesperado al cargar esta sección.'}
        </p>
        <p className="text-sm text-theme-faint mb-8">
          Si el problema persiste, contacta al administrador del sistema.
        </p>
        <div className="flex gap-3 justify-center">
          <button type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-base"
          >
            <RefreshCw size={16} />
            Reintentar
          </button>
          <button type="button"
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 bg-card border border-strong hover:bg-theme-surface text-main font-semibold px-5 py-2.5 rounded-xl transition-colors text-base"
          >
            <ArrowLeft size={16} />
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}
