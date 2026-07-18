import api from '@/lib/api';
import type { Vaccination, CreateVaccinationDto, GalponVaccine } from '../types/vaccination.types';

export const vaccinationService = {
  async getAll(filters?: { profileId?: string, startDate?: string, endDate?: string }): Promise<Vaccination[]> {
    const params = new URLSearchParams();
    params.append('limit', '1000');
    if (filters?.profileId) params.append('profileId', filters.profileId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const { data } = await api.get<{ success: boolean; vaccinations: Vaccination[] }>(`/vaccinations?${params.toString()}`);
    return data.vaccinations;
  },

  async create(payload: CreateVaccinationDto): Promise<Vaccination[]> {
    const { data } = await api.post<{ success: boolean; vaccinations: Vaccination[] }>('/vaccinations', payload);
    return data.vaccinations;
  },

  async getGalponVaccines(): Promise<GalponVaccine[]> {
    const { data } = await api.get<{ success: boolean; vaccines: GalponVaccine[] }>('/vaccines');
    return data.vaccines;
  },
};
