import api from '@/lib/api';
import type { Reproduction, CreateReproductionDto, UpdateReproductionDto, ReproductionFemale, ReproductionMale } from '../types/reproduction.types';

export const reproductionService = {
  async getAll(): Promise<Reproduction[]> {
    const { data } = await api.get<{ success: boolean; reproductions: Reproduction[] }>('/reproductions');
    return data.reproductions;
  },

  async create(payload: CreateReproductionDto): Promise<Reproduction> {
    const { data } = await api.post<{ success: boolean; reproduction: Reproduction }>('/reproductions', payload);
    return data.reproduction;
  },

  async update(id: number, payload: UpdateReproductionDto): Promise<Reproduction> {
    const { data } = await api.put<{ success: boolean; reproduction: Reproduction }>(`/reproductions/${id}`, payload);
    return data.reproduction;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/reproductions/${id}`);
  },

  async getReproductionFemales(): Promise<ReproductionFemale[]> {
    const { data } = await api.get<{ success: boolean; females: ReproductionFemale[] }>('/reproduction-females');
    return data.females;
  },

  async getReproductionMales(): Promise<ReproductionMale[]> {
    const { data } = await api.get<{ success: boolean; males: ReproductionMale[] }>('/reproduction-males');
    return data.males;
  },

  async getCalendar(year: number, month: number): Promise<Record<string, Reproduction[]>> {
    const { data } = await api.get<{ success: boolean; calendar: Record<string, Reproduction[]> }>('/reproductions/calendar', {
      params: { year, month }
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
};
