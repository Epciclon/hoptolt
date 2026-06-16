'use client';

import { useState, useEffect } from 'react';
import { galponService } from '../services/galpon.service';
import type { Galpon } from '../types/galpon.types';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';

const ACTIVE_GALPON_KEY = 'activeGalpon';

export function useActiveGalpon() {
  const [activeGalpon, setActiveGalpon] = useState<Galpon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { refetchUser } = useAuthContext();

  useEffect(() => {
    const fetchActiveGalpon = async () => {
      try {
        setLoading(true);
        setError(null);

        // Primero obtener del backend para sincronizar
        const galpon = await galponService.getActive();
        if (galpon) {
          setActiveGalpon(galpon);
          if (typeof window !== 'undefined') {
            localStorage.setItem(ACTIVE_GALPON_KEY, JSON.stringify(galpon));
          }
        } else {
          // Si no hay galpón activo en backend, limpiar localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem(ACTIVE_GALPON_KEY);
          }
          setActiveGalpon(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar galpón activo');
        setActiveGalpon(null);
        // Limpiar localStorage en caso de error
        if (typeof window !== 'undefined') {
          localStorage.removeItem(ACTIVE_GALPON_KEY);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchActiveGalpon();
  }, []);

  const setActive = async (galponId: number): Promise<boolean> => {
    try {
      await galponService.setActive(galponId);
      const galpon = await galponService.getById(galponId);
      setActiveGalpon(galpon);
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACTIVE_GALPON_KEY, JSON.stringify(galpon));
      }
      // Re-fetch user session and permissions for the new active galpón
      await refetchUser();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al seleccionar galpón');
      return false;
    }
  };

  return { activeGalpon, loading, error, setActive };
}

