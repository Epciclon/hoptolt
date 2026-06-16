'use client';

import { useState, useEffect, useCallback } from 'react';
import { dewormingService } from '../services/deworming.service';
import { assignmentService } from '@/modules/assignments/services/assignment.service';
import type { Deworming } from '../types/deworming.types';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';

export function useDeworming() {
  const [dewormings, setDewormings] = useState<Deworming[]>([]);
  const [assignedRabbits, setAssignedRabbits] = useState<AssignedRabbit[]>([]);
  const [dewormingPeriod, setDewormingPeriod] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDewormings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dewormingService.getAll();
      setDewormings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar desparasitaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAssignedRabbits = useCallback(async () => {
    try {
      const data = await assignmentService.getAssignedRabbits();
      setAssignedRabbits(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar conejos asignados');
    }
  }, []);

  const fetchDewormingPeriod = useCallback(async () => {
    try {
      const data = await dewormingService.getGalponDewormingPeriod();
      setDewormingPeriod(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar período de desparasitación');
    }
  }, []);

  const createDeworming = useCallback(async (payload: { rabbitIds: number[] }) => {
    try {
      setError(null);
      await dewormingService.create(payload);
      await fetchDewormings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar desparasitación');
      throw err;
    }
  }, [fetchDewormings]);

  useEffect(() => {
    Promise.all([fetchDewormings(), fetchAssignedRabbits(), fetchDewormingPeriod()]);
  }, [fetchDewormings, fetchAssignedRabbits, fetchDewormingPeriod]);

  return { 
    dewormings, 
    assignedRabbits, 
    dewormingPeriod, 
    loading, 
    error, 
    fetchDewormings,
    createDeworming 
  };
}
