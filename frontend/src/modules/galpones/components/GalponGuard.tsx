'use client';

import { useActiveGalpon } from '../hooks/useActiveGalpon';
import { Alert, Button } from '@/shared/ui';
import Link from 'next/link';

interface GalponGuardProps {
  children: React.ReactNode;
  requireGalpon?: boolean;
  customMessage?: string;
  customDescription?: string;
}

export function GalponGuard({ children, requireGalpon = true, customMessage, customDescription }: GalponGuardProps) {
  const { activeGalpon, loading } = useActiveGalpon();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (requireGalpon && !activeGalpon) {
    return (
      <div className="p-4">
        <div className="max-w-md mx-auto">
          <Alert
            variant="error"
            message={customMessage || "No hay galpón seleccionado"}
          />
          <p className="text-slate-600 text-sm mt-4 mb-6">
            {customDescription || "Debes registrar y seleccionar un galpón antes de poder gestionar la crianza. Dirígete a la sección de Galpones para crear uno."}
          </p>
          <Link href="/dashboard/galpones">
            <Button className="w-full">
              Ir a Galpones
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
