import api from '@/lib/api';
import type { Vaccination, CreateVaccinationDto, GalponVaccine } from '../types/vaccination.types';

export const vaccinationService = {
  async getAll(): Promise<Vaccination[]> {
    const { data } = await api.get<{ success: boolean; vaccinations: Vaccination[] }>('/vaccinations');
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
