'use client';

import { useState, useEffect, useCallback } from 'react';
import { feedingService } from '../services/feeding.service';
import { assignmentService } from '@/modules/assignments/services/assignment.service';
import { farmMemberService } from '@/modules/farmMember/services/farmMember.service';
import { useActiveGalpon } from '@/modules/galpones/hooks/useActiveGalpon';
import type { Feeding } from '../types/feeding.types';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';

export function useFeeding() {
  const [feedings, setFeedings] = useState<Feeding[]>([]);
  const [assignedRabbits, setAssignedRabbits] = useState<AssignedRabbit[]>([]);
  const [foodTypes, setFoodTypes] = useState<string[]>([]);
  const [assignedCageIds, setAssignedCageIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { activeGalpon } = useActiveGalpon();

  const fetchFeedings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await feedingService.getAll();
      setFeedings(data);
    } catch (err) {
      // Si es un error 403 (sin permisos), no mostrar error, solo dejar vacío
      if (err instanceof Error && err.message.includes('403')) {
        setFeedings([]);
      } else {
        setError(err instanceof Error ? err.message : 'Error al cargar alimentaciones');
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
      // Si es un error 403 (sin permisos), no mostrar error, solo dejar vacío
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
      // Obtener las jaulas asignadas del trabajador en el galpón activo
      const activeMembership = memberships.find(m => m.galponId === activeGalpon?.id);
      if (activeMembership && activeMembership.assignedCages) {
        const cageIds = activeMembership.assignedCages.map((ac: any) => ac.cageId);
        setAssignedCageIds(cageIds);
      } else {
        setAssignedCageIds([]);
      }
    } catch (err) {
      // Si hay error, no filtrar por jaulas (mostrar todas)
      setAssignedCageIds([]);
    }
  }, [activeGalpon]);

  const fetchFoodTypes = useCallback(async () => {
    try {
      setError(null);
      const data = await feedingService.getFoodTypes();
      setFoodTypes(data);
    } catch (err) {
      // Si es un error 403 (sin permisos), no mostrar error, solo dejar vacío
      if (err instanceof Error && err.message.includes('403')) {
        setFoodTypes([]);
      } else {
        setError(err instanceof Error ? err.message : 'Error al cargar tipos de alimento');
      }
    }
  }, []);

  const createFeeding = useCallback(async (payload: { cageIds: number[]; foodTypes: string[]; justification?: string }) => {
    try {
      setError(null);
      await feedingService.create(payload);
      await fetchFeedings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar alimentación');
      throw err;
    }
  }, [fetchFeedings]);

  useEffect(() => {
    fetchFeedings();
    fetchAssignedRabbits();
    fetchFoodTypes();
    fetchAssignedCages();
  }, [fetchFeedings, fetchAssignedRabbits, fetchFoodTypes, fetchAssignedCages]);

  // Filtrar assignedRabbits según las jaulas asignadas al trabajador
  const filteredAssignedRabbits = assignedCageIds.length > 0
    ? assignedRabbits.filter(rabbit => rabbit.cageId && assignedCageIds.includes(rabbit.cageId))
    : assignedRabbits;

  return { feedings, assignedRabbits: filteredAssignedRabbits, foodTypes, loading, error, fetchFeedings, createFeeding };
}
