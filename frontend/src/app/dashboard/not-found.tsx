import Link from 'next/link';
import { Search, ArrowLeft } from 'lucide-react';

export default function DashboardNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <Search size={36} className="text-primary-400" />
        </div>
        <h1 className="text-5xl font-bold text-primary-500 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-slate-700 mb-3">Sección no encontrada</h2>
        <p className="text-base text-slate-500 mb-8">
          Esta sección no existe. Puede que el enlace esté desactualizado o que el módulo aún no esté disponible.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-base"
        >
          <ArrowLeft size={16} />
          Volver al Panel
        </Link>
      </div>
    </div>
  );
}
