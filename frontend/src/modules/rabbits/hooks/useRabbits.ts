'use client';

import { useState, useEffect, useCallback } from 'react';
import { rabbitService } from '../services/rabbit.service';
import type { Rabbit } from '../types/rabbit.types';

export function useRabbits() {
  const [rabbits, setRabbits] = useState<Rabbit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRabbits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRabbits(await rabbitService.getAll());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los conejos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRabbits(); }, [fetchRabbits]);

  const deleteRabbit = async (id: number): Promise<boolean> => {
    try {
      await rabbitService.delete(id);
      setRabbits((prev) => prev.filter((r) => r.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el conejo.');
      return false;
    }
  };

  return { rabbits, loading, error, fetchRabbits, deleteRabbit };
}
