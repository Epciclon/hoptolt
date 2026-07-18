'use client';

import { useGalpon } from './useGalpon';

export function useGalpones() {
  const { galpones, loading, error, fetchGalpones } = useGalpon();

  return {
    galpones,
    loading,
    error,
    refetch: fetchGalpones,
  };
}
