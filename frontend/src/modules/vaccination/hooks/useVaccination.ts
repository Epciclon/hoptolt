'use client';

import { useState, useEffect, useCallback } from 'react';
import { vaccinationService } from '../services/vaccination.service';
import { assignmentService } from '@/modules/assignments/services/assignment.service';
import type { Vaccination, GalponVaccine } from '../types/vaccination.types';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';

export function useVaccination() {
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [assignedRabbits, setAssignedRabbits] = useState<AssignedRabbit[]>([]);
  const [galponVaccines, setGalponVaccines] = useState<GalponVaccine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVaccinations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await vaccinationService.getAll();
      setVaccinations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar vacunaciones');
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

  const fetchGalponVaccines = useCallback(async () => {
    try {
      const data = await vaccinationService.getGalponVaccines();
      setGalponVaccines(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar vacunas del galpón');
    }
  }, []);

  const createVaccination = useCallback(async (payload: { rabbitIds: number[]; vaccines: string[] }) => {
    try {
      setError(null);
      await vaccinationService.create(payload);
      await fetchVaccinations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar vacunación');
      throw err;
    }
  }, [fetchVaccinations]);

  useEffect(() => {
    Promise.all([fetchVaccinations(), fetchAssignedRabbits(), fetchGalponVaccines()]);
  }, [fetchVaccinations, fetchAssignedRabbits, fetchGalponVaccines]);

  return { 
    vaccinations, 
    assignedRabbits, 
    galponVaccines, 
    loading, 
    error, 
    fetchVaccinations,
    createVaccination 
  };
}
