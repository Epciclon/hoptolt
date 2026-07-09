'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vaccinationService } from '../services/vaccination.service';
import { assignmentService } from '@/modules/assignments/services/assignment.service';


export function useVaccination(filters?: { profileId?: string; date?: string }) {
  const queryClient = useQueryClient();

  // Query: Fetch Vaccinations
  const {
    data: vaccinations = [],
    isLoading: loadingVaccinations,
    error: errorVaccinations,
    refetch: fetchVaccinations,
  } = useQuery({
    queryKey: ['vaccinations', filters?.profileId, filters?.date],
    queryFn: () => {
      let startDate, endDate;
      if (filters?.date) {
        startDate = `${filters.date}T00:00:00-05:00`;
        endDate = `${filters.date}T23:59:59-05:00`;
      }
      return vaccinationService.getAll({ profileId: filters?.profileId, startDate, endDate });
    },
  });

  // Query: Fetch Assigned Rabbits
  const {
    data: assignedRabbits = [],
    isLoading: loadingRabbits,
    error: errorRabbits,
  } = useQuery({
    queryKey: ['assignedRabbits'],
    queryFn: () => assignmentService.getAssignedRabbits(),
  });

  // Query: Fetch Galpon Vaccines
  const {
    data: galponVaccines = [],
    isLoading: loadingVaccines,
    error: errorVaccines,
  } = useQuery({
    queryKey: ['galponVaccines'],
    queryFn: () => vaccinationService.getGalponVaccines(),
  });

  const loading = loadingVaccinations || loadingRabbits || loadingVaccines;
  const error = (() => {
    if (errorVaccinations) return (errorVaccinations as Error).message;
    if (errorRabbits) return (errorRabbits as Error).message;
    if (errorVaccines) return (errorVaccines as Error).message;
    return null;
  })();

  // Mutation: Create Vaccination
  const createVaccinationMutation = useMutation({
    mutationFn: (payload: { rabbitIds: number[]; vaccines: string[] }) => vaccinationService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccinations'] });
      queryClient.invalidateQueries({ queryKey: ['active-dates'] });
    },
  });

  const createVaccination = async (payload: { rabbitIds: number[]; vaccines: string[] }) => {
    return createVaccinationMutation.mutateAsync(payload);
  };

  return {
    vaccinations,
    assignedRabbits,
    galponVaccines,
    loading,
    error,
    createVaccination,
    isCreating: createVaccinationMutation.isPending,
    fetchVaccinations,
  };
}
