'use client';

import { useMemo, useCallback } from 'react';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';

export function usePermissions() {
  const { user, loading } = useAuthContext();

  const role = user?.role || null;
  
  // Extraer los nombres de los módulos que tienen permiso de lectura activo
  const permissions = useMemo(() => {
    return user?.permissions
      ?.filter(p => p.canRead)
      .map(p => p.moduleName) || [];
  }, [user]);

  // Función para verificar si tiene permiso para un módulo específico
  const hasPermission = useCallback((moduleName: string): boolean => {
    if (role === 'owner' || permissions.includes('all')) return true;
    return permissions.includes(moduleName);
  }, [role, permissions]);

  return { permissions, role, loading, hasPermission };
}

