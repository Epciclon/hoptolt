'use client';

import { useState, useEffect, useCallback } from 'react';
import { reproductionService } from '../services/reproduction.service';
import type { Reproduction, ReproductionFemale, ReproductionMale } from '../types/reproduction.types';

export function useReproduction() {
  const [reproductions, setReproductions] = useState<Reproduction[]>([]);
  const [reproductionFemales, setReproductionFemales] = useState<ReproductionFemale[]>([]);
  const [reproductionMales, setReproductionMales] = useState<ReproductionMale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReproductions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reproductionService.getAll();
      setReproductions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar reproducciones');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReproductionFemales = useCallback(async () => {
    try {
      const data = await reproductionService.getReproductionFemales();
      setReproductionFemales(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar conejas de reproducción');
    }
  }, []);

  const fetchReproductionMales = useCallback(async () => {
    try {
      const data = await reproductionService.getReproductionMales();
      setReproductionMales(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar machos de reproducción');
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchReproductions(), fetchReproductionFemales(), fetchReproductionMales()]);
  }, [fetchReproductions, fetchReproductionFemales, fetchReproductionMales]);

  const createReproduction = useCallback(async (payload: { femaleId: number; mountDate: string }) => {
    try {
      setError(null);
      await reproductionService.create(payload);
      await fetchReproductions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar monta');
      throw err;
    }
  }, [fetchReproductions]);

  const updateReproduction = useCallback(async (id: number, payload: { maleId?: number; mountDate: string }) => {
    try {
      setError(null);
      await reproductionService.update(id, payload);
      await fetchReproductions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar monta');
      throw err;
    }
  }, [fetchReproductions]);

  const deleteReproduction = async (id: number): Promise<boolean> => {
    try {
      await reproductionService.delete(id);
      setReproductions(prev => prev.filter(r => r.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar reproducción');
      return false;
    }
  };

  return {
    reproductions,
    reproductionFemales,
    reproductionMales,
    loading,
    error,
    fetchReproductions,
    createReproduction,
    updateReproduction,
    deleteReproduction
  };
}
