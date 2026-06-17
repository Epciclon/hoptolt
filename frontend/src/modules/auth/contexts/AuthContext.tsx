'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { authService } from '../services/auth.service';
import type { Profile } from '../types/auth.types';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextValue {
  user: Profile | null;
  loading: boolean;
  refetchUser: () => Promise<void>;
  logout: () => Promise<void>;
  supabase: ReturnType<typeof createClient>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const queryClient = useQueryClient();

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Si hay sesión en Supabase, traemos el perfil enriquecido del backend
      const profile = await authService.getMe();
      setUser(profile);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const logout = useCallback(async () => {
    try {
      // Limpiar todo el caché de React Query para que no queden datos de la sesión anterior
      queryClient.clear();
      // Cerrar sesión en Supabase
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      // Limpiar estado local
      setUser(null);
      // Hacer un reemplazo de ubicación completo para limpiar todo el cache del cliente
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      }
    }
  }, [supabase, queryClient]);

  useEffect(() => {
    fetchUser();

    // El listener onAuthStateChange fue eliminado porque causaba deadlocks
    // cuando llamaba a fetchUser() dentro del callback.
    // El AuthContext ya llama a fetchUser() en el useEffect inicial,
    // y el login ya sincroniza el perfil, por lo que no es necesario.
  }, [fetchUser, router]);

  return (
    <AuthContext.Provider value={{ user, loading, refetchUser: fetchUser, logout, supabase }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext debe usarse dentro de un AuthProvider');
  }
  return context;
}
