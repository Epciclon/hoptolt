'use client';

import { useState, useCallback } from 'react';
import { farmMemberService } from '../services/farmMember.service';
import type { FarmMember } from '../types/farmMember.types';

export function useFarmMember() {
  const [workers, setWorkers] = useState<FarmMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkers = useCallback(async (galponId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await farmMemberService.getWorkersByGalpon(galponId);
      setWorkers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar trabajadores.');
    } finally {
      setLoading(false);
    }
  }, []);

  const removeWorker = async (id: number) => {
    try {
      await farmMemberService.removeWorker(id);
      setWorkers(prev => prev.filter(w => w.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar trabajador.');
      return false;
    }
  };

  const updateWorker = async (id: number, data: any) => {
    try {
      await farmMemberService.updateWorker(id, data);
      setWorkers(prev => prev.map(w => w.id === id ? { ...w, ...data } : w));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar trabajador.');
      return false;
    }
  };

  return { workers, loading, error, fetchWorkers, removeWorker, updateWorker };
}
