'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { usePermissions } from '@/modules/farmMember/hooks/usePermissions';

// Mapeo de rutas a módulos de permisos
const routeToPermissionMap: Record<string, string> = {
  '/dashboard/cages': 'cages',
  '/dashboard/races': 'races',
  '/dashboard/rabbits': 'rabbits',
  '/dashboard/genealogy': 'genealogy',
  '/dashboard/assignments': 'assignments',
  '/dashboard/feeding': 'feeding',
  '/dashboard/vaccination': 'vaccination',
  '/dashboard/deworming': 'deworming',
  '/dashboard/cleaning': 'cleaning',
  '/dashboard/mortality': 'mortality',
  '/dashboard/reproduction': 'reproduction',
  '/dashboard/users': 'farmMembers',
  '/dashboard/reports': 'reports',
};

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export function PermissionGuard({ children, requiredPermission }: PermissionGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { hasPermission, role, loading } = usePermissions();

  useEffect(() => {
    if (loading) return;

    // Si es owner, tiene acceso a todo
    if (role === 'owner') return;

    // Determinar el permiso requerido basado en la ruta actual
    // Encontrar una coincidencia por prefijo en routeToPermissionMap,
    // ordenando por longitud de clave descendente para que coincida la ruta más específica primero.
    const matchedRoute = Object.keys(routeToPermissionMap)
      .sort((a, b) => b.length - a.length)
      .find(route => pathname === route || pathname.startsWith(route + '/'));

    const permission = requiredPermission || (matchedRoute ? routeToPermissionMap[matchedRoute] : undefined);

    // Si no hay mapeo para esta ruta, permitir acceso (para rutas libres como /dashboard o /dashboard/galpones)
    if (!permission) return;

    // Verificar si tiene permiso
    if (!hasPermission(permission)) {
      router.replace('/dashboard');
    }
  }, [hasPermission, role, loading, requiredPermission, pathname, router]);

  // Mientras carga, no mostrar nada
  if (loading) return null;

  return <>{children}</>;
}

