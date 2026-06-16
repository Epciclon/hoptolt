'use client';

import { useState, useEffect, useCallback } from 'react';
import { assignmentService } from '../services/assignment.service';
import type { Assignment } from '../types/assignment.types';

export function useAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setAssignments(await assignmentService.getAll());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las asignaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const unassignRabbit = async (id: number): Promise<boolean> => {
    try {
      await assignmentService.deleteById(id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desasignar el conejo.');
      return false;
    }
  };

  const assignRabbits = async (payload: { cageId: number; rabbitIds: number[] }): Promise<{ assignments: Assignment[]; warnings: string[] }> => {
    try {
      const result = await assignmentService.assign(payload);
      await fetchAssignments();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar los conejos.');
      throw err;
    }
  };

  return { assignments, loading, error, fetchAssignments, unassignRabbit, assignRabbits };
}
