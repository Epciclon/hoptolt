import api from '@/lib/api';
import type { Growth } from '../types/growth.types';

export const growthService = {
    getHistory: async (rabbitId: number): Promise<Growth[]> => {
        const response = await api.get(`/growth/history/${rabbitId}`);
        return response.data.data;
    }
};
