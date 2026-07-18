import api from '@/lib/api';
import type { Reproduction, CreateReproductionDto, StartMatingDto, MatingRabbit, ReproductionFemale, ReproductionMale } from '../types/reproduction.types';

export const reproductionService = {
  async getAll(options?: { page?: number, limit?: number, status?: string | null, profileId?: string, startDate?: string, endDate?: string }): Promise<{ reproductions: Reproduction[]; pagination: any }> {
    const params = new URLSearchParams({
      page: (options?.page || 1).toString(),
      limit: (options?.limit || 10).toString(),
    });
    if (options?.status) params.append('status', options.status);
    if (options?.profileId) params.append('profileId', options.profileId);
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);

    const { data } = await api.get<{ success: boolean; reproductions: Reproduction[]; pagination: any }>(`/reproductions?${params}`);
    return { reproductions: data.reproductions, pagination: data.pagination };
  },

  async create(payload: CreateReproductionDto): Promise<Reproduction> {
    const { data } = await api.post<{ success: boolean; reproduction: Reproduction }>('/reproductions', payload);
    return data.reproduction;
  },

  async update(id: number, payload: Partial<CreateReproductionDto>): Promise<Reproduction> {
    const { data } = await api.put<{ success: boolean; reproduction: Reproduction }>(`/reproductions/${id}`, payload);
    return data.reproduction;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/reproductions/${id}`);
  },

  async getAvailableMalesForMating(): Promise<MatingRabbit[]> {
    const { data } = await api.get<{ success: boolean; males: MatingRabbit[] }>('/reproductions/males-for-mating');
    return data.males;
  },

  async getAvailableFemalesForMating(maleId: number): Promise<MatingRabbit[]> {
    const { data } = await api.get<{ success: boolean; females: MatingRabbit[] }>(`/reproductions/females-for-mating/${maleId}`);
    return data.females;
  },

  async startMating(payload: StartMatingDto): Promise<Reproduction> {
    const { data } = await api.post<{ success: boolean; reproduction: Reproduction }>('/reproductions/start-mating', payload);
    return data.reproduction;
  },

  async finishMating(id: number): Promise<Reproduction> {
    const { data } = await api.post<{ success: boolean; reproduction: Reproduction }>(`/reproductions/${id}/finish-mating`);
    return data.reproduction;
  },

  async registerBirth(id: number, payload: { bornKits?: number; actualBirthDate?: string }): Promise<Reproduction> {
    const { data } = await api.post<{ success: boolean; reproduction: Reproduction }>(`/reproductions/${id}/register-birth`, payload);
    return data.reproduction;
  },

  async cancelReproduction(id: number, action: 'delete' | 'fail', reason?: string): Promise<any> {
    const { data } = await api.post(`/reproductions/${id}/cancel`, { action, reason });
    return data;
  },

  async finishLactation(id: number): Promise<Reproduction> {
    const { data } = await api.post<{ success: boolean; reproduction: Reproduction }>(`/reproductions/${id}/finish-lactation`);
    return data.reproduction;
  },

  async getCalendar(year: number, month: number, type: string = 'births'): Promise<Record<string, Reproduction[]>> {
    const { data } = await api.get<{ success: boolean; calendar: Record<string, Reproduction[]> }>('/reproductions/calendar', {
      params: { year, month, type }
    });
    return data.calendar;
  },

  async getByDay(year: number, month: number, day: number): Promise<Reproduction[]> {
    const { data } = await api.get<{ success: boolean; reproductions: Reproduction[] }>('/reproductions/by-day', {
      params: { year, month, day }
    });
    return data.reproductions;
  },

  async getById(id: number): Promise<Reproduction> {
    const { data } = await api.get<{ success: boolean; reproduction: Reproduction }>(`/reproductions/${id}`);
    return data.reproduction;
  },

  async getReproductionFemales(): Promise<ReproductionFemale[]> {
    const { data } = await api.get<{ success: boolean; females: ReproductionFemale[] }>('/reproduction-females');
    return data.females;
  },

  async getReproductionMales(): Promise<ReproductionMale[]> {
    const { data } = await api.get<{ success: boolean; males: ReproductionMale[] }>('/reproduction-males');
    return data.males;
  },
};
