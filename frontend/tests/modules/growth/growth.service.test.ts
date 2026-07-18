import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('growthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getHistory fetches growth records for a rabbit', async () => {
    const mockHistory = [{ id: 1, rabbitId: 5, weight: 2.5, date: '2024-01-15' }];
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockHistory } });

    const { growthService } = await import('@/modules/growth/services/growth.service');
    const result = await growthService.getHistory(5);

    expect(api.get).toHaveBeenCalledWith('/growth/history/5');
    expect(result).toEqual(mockHistory);
  });

  it('returns empty array when no history exists', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });

    const { growthService } = await import('@/modules/growth/services/growth.service');
    const result = await growthService.getHistory(999);

    expect(result).toEqual([]);
  });
});
