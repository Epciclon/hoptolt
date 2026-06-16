'use client';

import { useState, useEffect, useCallback } from 'react';
import { mortalityService } from '../services/mortality.service';
import { assignmentService } from '@/modules/assignments/services/assignment.service';
import { farmMemberService } from '@/modules/farmMember/services/farmMember.service';
import { useActiveGalpon } from '@/modules/galpones/hooks/useActiveGalpon';
import type { Mortality, CreateMortalityDto } from '../types/mortality.types';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';

export function useMortality() {
  const [mortalities, setMortalities] = useState<Mortality[]>([]);
  const [assignedRabbits, setAssignedRabbits] = useState<AssignedRabbit[]>([]);
  const [assignedCageIds, setAssignedCageIds] = useState<number[]>([]);
  const [isWorker, setIsWorker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { activeGalpon } = useActiveGalpon();

  const fetchMortalities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await mortalityService.getAll();
      setMortalities(data);
    } catch (err) {
      if (err instanceof Error && err.message.includes('403')) {
        setMortalities([]);
      } else {
        setError(err instanceof Error ? err.message : 'Error al cargar mortalidades');
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

  const createMortality = useCallback(async (payload: CreateMortalityDto) => {
    try {
      setError(null);
      await mortalityService.create(payload);
      await Promise.all([fetchMortalities(), fetchAssignedRabbits()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar mortalidad');
      throw err;
    }
  }, [fetchMortalities, fetchAssignedRabbits]);

  useEffect(() => {
    if (activeGalpon) {
      Promise.all([fetchMortalities(), fetchAssignedRabbits(), fetchAssignedCages()]);
    }
  }, [activeGalpon, fetchMortalities, fetchAssignedRabbits, fetchAssignedCages]);

  const filteredAssignedRabbits = isWorker
    ? assignedRabbits.filter(rabbit => rabbit.cageId && assignedCageIds.includes(rabbit.cageId))
    : assignedRabbits;

  return {
    mortalities,
    assignedRabbits: filteredAssignedRabbits,
    loading,
    error,
    fetchMortalities,
    fetchAssignedRabbits,
    createMortality
  };
}
