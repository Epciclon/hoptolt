'use client';

import { useState, useEffect, useCallback } from 'react';
import { cageService } from '../services/cage.service';
import type { Cage } from '../types/cage.types';

export function useCages() {
  const [cages, setCages] = useState<Cage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cageService.getAll();
      setCages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las jaulas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCages();
  }, [fetchCages]);

  const deleteCage = async (id: number): Promise<boolean> => {
    try {
      await cageService.delete(id);
      setCages((prev) => prev.filter((c) => c.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la jaula.');
      return false;
    }
  };

  return { cages, loading, error, fetchCages, deleteCage };
}
