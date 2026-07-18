import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Search size={40} className="text-primary-400" />
        </div>
        <h1 className="text-6xl font-bold text-primary-500 mb-2">404</h1>
        <h2 className="text-2xl font-semibold text-main mb-3">Página no encontrada</h2>
        <p className="text-base text-muted mb-8">
          La página que buscas no existe o fue movida. Verifica la dirección o regresa al inicio.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-base"
        >
          <Home size={18} />
          Volver al Panel
        </Link>
      </div>
    </div>
  );
}
