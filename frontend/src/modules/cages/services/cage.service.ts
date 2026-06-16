import api from '@/lib/api';
import type { Cage, CreateCageDto, UpdateCageDto } from '../types/cage.types';

export const cageService = {
  async getAll(): Promise<Cage[]> {
    const { data } = await api.get<{ success: boolean; cages: Cage[] }>('/cages');
    return data.cages;
  },

  async getById(id: number): Promise<Cage> {
    const { data } = await api.get<{ success: boolean; cage: Cage }>(`/cages/${id}`);
    return data.cage;
  },

  async getByNumber(number: number): Promise<Cage> {
    const cages = await this.getAll();
    const cage = cages.find(c => c.number === number);
    if (!cage) throw new Error(`Jaula #${number} no encontrada`);
    return cage;
  },

  async create(payload: CreateCageDto): Promise<Cage> {
    const { data } = await api.post<{ success: boolean; cage: Cage }>('/cages', payload);
    return data.cage;
  },

  async update(id: number, payload: UpdateCageDto): Promise<Cage> {
    const { data } = await api.put<{ success: boolean; cage: Cage }>(`/cages/${id}`, payload);
    return data.cage;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/cages/${id}`);
  },
};
