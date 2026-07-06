'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reproductionService } from '../services/reproduction.service';
import type { Reproduction } from '../types/reproduction.types';

export function useDashboardCalendar() {
  const [activeParams, setActiveParams] = useState<{ year: number; month: number; type: string } | null>(null);
  const prevTypeRef = useRef<string | null>(null);

  useEffect(() => {
    if (activeParams?.type) {
      prevTypeRef.current = activeParams.type;
    }
  }, [activeParams?.type]);

  // Query: Fetch Calendar
  const {
    data: calendar = {} as Record<string, any[]>,
    isLoading: loading,
    isFetching,
    error: queryError,
  } = useQuery({
    queryKey: ['dashboardCalendar', activeParams?.year, activeParams?.month, activeParams?.type],
    placeholderData: (prev, query) => {
      // Only keep previous data if we are navigating months within the SAME tab type.
      // If we switch tabs (types), we want to clear the calendar instantly.
      if (query && prevTypeRef.current === query.queryKey[3]) {
        return prev;
      }
      return undefined;
    },
    queryFn: () => {
      if (activeParams) {
        return reproductionService.getCalendar(activeParams.year, activeParams.month, activeParams.type);
      }
      return Promise.resolve({});
    },
    enabled: !!activeParams,
  });

  const fetchCalendar = useCallback(async (year: number, month: number, type: string = 'births') => {
    setActiveParams({ year, month, type });
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

  return { calendar, loading, isFetching, error, fetchCalendar, fetchByDay, fetchById };
}
