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

describe('dewormingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll fetches deworming records with filters', async () => {
    const mockDewormings = [{ id: 1, rabbitId: 5, product: 'Ivomec' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, dewormings: mockDewormings } });

    const { dewormingService } = await import('@/modules/deworming/services/deworming.service');
    const result = await dewormingService.getAll();

    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/dewormings?'));
    expect(result).toEqual(mockDewormings);
  });

  it('getAll passes optional filters', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, dewormings: [] } });

    const { dewormingService } = await import('@/modules/deworming/services/deworming.service');
    await dewormingService.getAll({ profileId: 'abc', startDate: '2024-01-01', endDate: '2024-12-31' });

    const url = (api.get as any).mock.calls[0][0];
    expect(url).toContain('profileId=abc');
    expect(url).toContain('startDate=2024-01-01');
    expect(url).toContain('endDate=2024-12-31');
  });

  it('create posts a new deworming record', async () => {
    const dto = { rabbitIds: [1, 2], product: 'Ivomec', applicationDate: '2024-03-15' };
    const mockDewormings = [{ id: 1 }, { id: 2 }];
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, dewormings: mockDewormings } });

    const { dewormingService } = await import('@/modules/deworming/services/deworming.service');
    const result = await dewormingService.create(dto as any);

    expect(api.post).toHaveBeenCalledWith('/dewormings', dto);
    expect(result).toEqual(mockDewormings);
  });

  it('getGalponDewormingPeriod returns the deworming period in months', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, dewormingPeriod: 3 } });

    const { dewormingService } = await import('@/modules/deworming/services/deworming.service');
    const result = await dewormingService.getGalponDewormingPeriod();

    expect(api.get).toHaveBeenCalledWith('/deworming-period');
    expect(result).toBe(3);
  });
});
