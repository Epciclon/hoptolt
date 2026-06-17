'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reproductionService } from '../services/reproduction.service';
import type { Reproduction } from '../types/reproduction.types';

export function useBirthCalendar() {
  const [activeParams, setActiveParams] = useState<{ year: number; month: number } | null>(null);

  // Query: Fetch Calendar
  const {
    data: calendar = {} as Record<string, any[]>,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['birthCalendar', activeParams?.year, activeParams?.month],
    queryFn: () => {
      if (activeParams) {
        return reproductionService.getCalendar(activeParams.year, activeParams.month);
      }
      return Promise.resolve({});
    },
    enabled: !!activeParams,
  });

  const fetchCalendar = useCallback(async (year: number, month: number) => {
    setActiveParams({ year, month });
  }, []);

  const fetchByDay = useCallback(async (year: number, month: number, day: number) => {
    try {
      return await reproductionService.getByDay(year, month, day);
    } catch (err) {
      return [];
    }
  }, []);

  const fetchById = useCallback(async (id: number) => {
    try {
      return await reproductionService.getById(id);
    } catch (err) {
      return null;
    }
  }, []);

  const error = queryError ? (queryError as Error).message : null;

  return { calendar, loading, error, fetchCalendar, fetchByDay, fetchById };
}
