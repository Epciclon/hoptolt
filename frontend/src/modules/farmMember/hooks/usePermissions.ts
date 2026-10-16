'use client';

import { useMemo, useCallback } from 'react';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';

const canonicalGroups: string[][] = [
  ['feeding', 'alimentacion', 'alimentación'],
  ['vaccination', 'vacunacion', 'vacunación'],
  ['deworming', 'desparasitacion', 'desparasitación'],
  ['cleaning', 'limpieza'],
  ['mortality', 'mortalidad'],
  ['cages', 'jaulas', 'jaula'],
  ['rabbits', 'conejos', 'conejo'],
  ['races', 'razas', 'raza'],
  ['genealogy', 'arbolgenealogico', 'árbol genealógico', 'genealogia', 'genealogía'],
  ['assignments', 'asignarjaula', 'asignaciones', 'asignar jaula', 'asignacion', 'asignación', 'asignar'],
  ['reproduction', 'reproduccionyparto', 'reproducción y parto', 'reproduccion', 'reproducción'],
  ['farmmembers', 'gestionartrabajadores', 'usuarios', 'equipo de trabajo', 'farm_members']
];

const moduleAliases: Record<string, string[]> = {};
for (const group of canonicalGroups) {
  const normalizedGroup = group.map(g => g.toLowerCase());
  for (const item of group) {
    moduleAliases[item.toLowerCase()] = normalizedGroup;
  }
}

export function usePermissions() {
  const { user, loading } = useAuthContext();

  const role = user?.role || null;
  
  // Extraer los nombres de los módulos que tienen permiso de lectura activo
  const permissions = useMemo(() => {
    return user?.permissions
      ?.filter(p => p.canRead)
      .map(p => p.moduleName.toLowerCase()) || [];
  }, [user]);

  // Función para verificar si tiene permiso para un módulo específico (soporta alias en español e inglés)
  const hasPermission = useCallback((moduleName: string): boolean => {
    if (role === 'owner' || permissions.includes('all')) return true;
    const lower = moduleName.toLowerCase();
    const targetAliases = moduleAliases[lower] || [lower];
    return permissions.some(p => targetAliases.includes(p));
  }, [role, permissions]);

  return { permissions, role, loading, hasPermission };
}


