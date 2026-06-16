import api from '@/lib/api';
import { Rabbit } from '@/modules/rabbits/types/rabbit.types';
import type { Growth, CreateGrowthDto } from '../types/growth.types';

export interface RespondToEstimationResult {
    status: string;
    message: string;
    data: {
        rabbit?: Rabbit;
    } | null;
}

export const growthService = {
    respondToEstimation: async (notificationId: number, action: 'accept' | 'reject' | 'revert', rabbitId?: number): Promise<RespondToEstimationResult> => {
        const response = await api.patch(`/growth/weight/${notificationId}/respond`, { action, rabbitId });
        return response.data;
    },

    getAll: async (): Promise<Growth[]> => {
        const response = await api.get('/growth');
        return response.data;
    },

    create: async (data: CreateGrowthDto): Promise<Growth> => {
        const response = await api.post('/growth', data);
        return response.data;
    }
};
