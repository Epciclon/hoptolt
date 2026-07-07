'use client';

import { useActiveGalpon } from '../hooks/useActiveGalpon';
import { Alert, Card } from '@/shared/ui';
import { SelectActiveGalpon } from './SelectActiveGalpon';

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
      <div className="p-4 max-w-4xl mx-auto">
        <Alert
          variant="error"
          message={customMessage || "No hay galpón seleccionado"}
        />
        <div className="mt-4 mb-6">
          <p className="text-slate-600 text-sm mb-4">
            {customDescription || "Selecciona uno de los galpones disponibles para continuar."}
          </p>
        </div>
        <Card>
          <div className="p-4">
            <SelectActiveGalpon />
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
