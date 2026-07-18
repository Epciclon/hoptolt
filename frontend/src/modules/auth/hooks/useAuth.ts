'use client';

import { useAuthContext } from '../contexts/AuthContext';

/**
 * Hook que expone el perfil del usuario autenticado.
 * Usa el estado global de AuthContext para evitar peticiones redundantes.
 */
export function useAuth() {
  return useAuthContext();
}
