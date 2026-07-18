'use client';

import { usePermissions } from '@/modules/farmMember/hooks/usePermissions';
import { Alert } from '@/shared/ui';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';
import { ReactNode } from 'react';

interface PermissionGuardProps {
  children: ReactNode;
  moduleName: string;
  requireOwner?: boolean;
}

export function PermissionGuard({ children, moduleName, requireOwner = false }: Readonly<PermissionGuardProps>) {
  const { hasPermission, loading } = usePermissions();
  const { user } = useAuthContext();
  const isOwner = user?.role === 'owner';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  // Si requiere ser dueño y no lo es
  if (requireOwner && !isOwner) {
    return (
      <div className="p-4">
        <div className="max-w-md mx-auto mt-12">
          <Alert variant="error" message="Acceso Denegado" />
          <p className="text-muted text-sm mt-4 text-center">
            Solo el propietario del criadero puede acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  // Si no es dueño y no tiene permiso de leer este módulo
  if (!isOwner && !hasPermission(moduleName)) {
    return (
      <div className="p-4">
        <div className="max-w-md mx-auto mt-12">
          <Alert variant="error" message="Acceso Denegado" />
          <p className="text-muted text-sm mt-4 text-center">
            No tienes los permisos necesarios para acceder a esta sección. Si crees que esto es un error, contacta al propietario del galpón.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
