'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error('[Error]', error);
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-screen bg-page flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={40} className="text-red-400" />
          </div>
          <h1 className="text-6xl font-bold text-red-400 mb-2">500</h1>
          <h2 className="text-2xl font-semibold text-main mb-3">Error del servidor</h2>
          <p className="text-base text-muted mb-8">
            Ocurrió un error inesperado. Por favor intenta de nuevo o regresa al inicio.
          </p>
          <div className="flex gap-3 justify-center">
            <button type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-base"
            >
              <RefreshCw size={18} />
              Reintentar
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-card border border-strong hover:bg-theme-surface text-main font-semibold px-6 py-3 rounded-xl transition-colors text-base"
            >
              <Home size={18} />
              Ir al inicio
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
