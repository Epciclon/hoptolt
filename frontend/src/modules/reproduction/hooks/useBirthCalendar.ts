'use client';

import { useState, useCallback } from 'react';
import { reproductionService } from '../services/reproduction.service';
import type { Reproduction } from '../types/reproduction.types';

export function useBirthCalendar() {
  const [calendar, setCalendar] = useState<Record<string, Reproduction[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendar = useCallback(async (year: number, month: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await reproductionService.getCalendar(year, month);
      setCalendar(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar calendario de partos');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchByDay = useCallback(async (year: number, month: number, day: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await reproductionService.getByDay(year, month, day);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar partos del día');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchById = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await reproductionService.getById(id);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar detalles de parto');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { calendar, loading, error, fetchCalendar, fetchByDay, fetchById };
}
