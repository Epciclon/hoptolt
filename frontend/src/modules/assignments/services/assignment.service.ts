import api from '@/lib/api';
import type { Assignment, AssignRabbitDto, UnassignRabbitDto, AssignedRabbit } from '../types/assignment.types';
import type { Rabbit } from '@/modules/rabbits/types/rabbit.types';
import type { Cage } from '@/modules/cages/types/cage.types';

export const assignmentService = {
  async getAll(): Promise<Assignment[]> {
    const { data } = await api.get<{ success: boolean; assignments: Assignment[] }>('/assignments');
    return data.assignments;
  },

  async getAssignedRabbits(): Promise<AssignedRabbit[]> {
    const { data } = await api.get<{ success: boolean; rabbits: AssignedRabbit[] }>('/assignments/assigned-rabbits');
    return data.rabbits;
  },

  async getAvailableRabbits(): Promise<Rabbit[]> {
    const { data } = await api.get<{ success: boolean; rabbits: Rabbit[] }>('/assignments/available-rabbits');
    return data.rabbits;
  },

  async getOperativeCages(): Promise<Cage[]> {
    const { data } = await api.get<{ success: boolean; cages: Cage[] }>('/assignments/operative-cages');
    return data.cages;
  },

  async assign(payload: AssignRabbitDto): Promise<{ assignments: Assignment[]; warnings: string[] }> {
    const { data } = await api.post<{ success: boolean; assignments: Assignment[]; warnings: string[] }>('/assignments', payload);
    return { assignments: data.assignments, warnings: data.warnings || [] };
  },

  async unassign(payload: UnassignRabbitDto): Promise<void> {
    await api.post('/unassign', payload);
  },

  async deleteById(id: number): Promise<void> {
    await api.delete(`/assignments/${id}`);
  },
};
