'use client';

import { useState, useEffect, useCallback } from 'react';
import { galponService } from '../services/galpon.service';
import type { Galpon } from '../types/galpon.types';

export function useGalpon() {
  const [galpones, setGalpones] = useState<Galpon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGalpones = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await galponService.getAll();
      setGalpones(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar galpones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGalpones();
  }, [fetchGalpones]);

  const deleteGalpon = async (id: number): Promise<boolean> => {
    try {
      await galponService.delete(id);
      setGalpones(prev => prev.filter(g => g.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar galpón');
      return false;
    }
  };

  return { galpones, loading, error, fetchGalpones, deleteGalpon };
}
