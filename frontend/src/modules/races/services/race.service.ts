import api from '@/lib/api';
import type { Race, CreateRaceDto, UpdateRaceDto } from '../types/race.types';

export interface GetRacesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface RacesResponse {
  races: Race[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const raceService = {
  async getAll(params?: GetRacesParams): Promise<RacesResponse> {
    const { data } = await api.get<{ success: boolean; races: Race[]; pagination: any }>('/races', { params });
    return { races: data.races, pagination: data.pagination };
  },

  async getById(id: number): Promise<Race> {
    const { data } = await api.get<{ success: boolean; race: Race }>(`/races/${id}`);
    return data.race;
  },

  async getByName(name: string): Promise<Race> {
    // Si el backend no tiene endpoint por nombre, buscamos en todos.
    const { data } = await api.get<{ success: boolean; races: Race[] }>('/races');
    const race = data.races.find(r => r.name === name);
    if (!race) throw new Error('Raza no encontrada');
    return race;
  },

  async create(payload: CreateRaceDto): Promise<Race> {
    const { data } = await api.post<{ success: boolean; race: Race }>('/races', payload);
    return data.race;
  },

  async update(id: number, payload: UpdateRaceDto): Promise<Race> {
    const { data } = await api.put<{ success: boolean; race: Race }>(`/races/${id}`, payload);
    return data.race;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/races/${id}`);
  },
};
