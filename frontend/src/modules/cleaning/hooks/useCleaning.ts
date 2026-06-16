'use client';

import { useState, useEffect, useCallback } from 'react';
import { cleaningService } from '../services/cleaning.service';
import { assignmentService } from '@/modules/assignments/services/assignment.service';
import { farmMemberService } from '@/modules/farmMember/services/farmMember.service';
import { useActiveGalpon } from '@/modules/galpones/hooks/useActiveGalpon';
import type { Cleaning, CreateCleaningDto } from '../types/cleaning.types';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';

export function useCleaning() {
  const [cleanings, setCleanings] = useState<Cleaning[]>([]);
  const [assignedRabbits, setAssignedRabbits] = useState<AssignedRabbit[]>([]);
  const [assignedCageIds, setAssignedCageIds] = useState<number[]>([]);
  const [isWorker, setIsWorker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { activeGalpon } = useActiveGalpon();

  const fetchCleanings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cleaningService.getAll();
      setCleanings(data);
    } catch (err) {
      if (err instanceof Error && err.message.includes('403')) {
        setCleanings([]);
      } else {
        setError(err instanceof Error ? err.message : 'Error al cargar limpiezas');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAssignedRabbits = useCallback(async () => {
    try {
      setError(null);
      const data = await assignmentService.getAssignedRabbits();
      setAssignedRabbits(data);
    } catch (err) {
      if (err instanceof Error && err.message.includes('403')) {
        setAssignedRabbits([]);
      } else {
        setError(err instanceof Error ? err.message : 'Error al cargar conejos asignados');
      }
    }
  }, []);

  const fetchAssignedCages = useCallback(async () => {
    try {
      setError(null);
      const memberships = await farmMemberService.getMyMemberships();
      const activeMembership = memberships.find(m => m.galponId === activeGalpon?.id);
      if (activeMembership) {
        setIsWorker(activeMembership.role === 'worker');
        if (activeMembership.assignedCages) {
          const cageIds = activeMembership.assignedCages.map((ac: any) => ac.cageId);
          setAssignedCageIds(cageIds);
        } else {
          setAssignedCageIds([]);
        }
      } else {
        setIsWorker(false);
        setAssignedCageIds([]);
      }
    } catch (err) {
      setIsWorker(false);
      setAssignedCageIds([]);
    }
  }, [activeGalpon]);

  const createCleaning = useCallback(async (payload: CreateCleaningDto) => {
    try {
      setError(null);
      await cleaningService.create(payload);
      await fetchCleanings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar limpieza');
      throw err;
    }
  }, [fetchCleanings]);

  useEffect(() => {
    fetchCleanings();
    fetchAssignedRabbits();
    fetchAssignedCages();
  }, [fetchCleanings, fetchAssignedRabbits, fetchAssignedCages]);

  const filteredAssignedRabbits = isWorker
    ? assignedRabbits.filter(rabbit => rabbit.cageId && assignedCageIds.includes(rabbit.cageId))
    : assignedRabbits;

  return { cleanings, assignedRabbits: filteredAssignedRabbits, loading, error, fetchCleanings, createCleaning };
}
