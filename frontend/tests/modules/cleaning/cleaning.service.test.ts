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

describe('cleaningService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll fetches cleanings with filters', async () => {
    const mockCleanings = [{ id: 1, cageId: 101 }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, cleanings: mockCleanings } });

    const { cleaningService } = await import('@/modules/cleaning/services/cleaning.service');
    const result = await cleaningService.getAll();

    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/cleanings?'));
    expect(result).toEqual(mockCleanings);
  });

  it('getAll passes optional filters', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, cleanings: [] } });

    const { cleaningService } = await import('@/modules/cleaning/services/cleaning.service');
    await cleaningService.getAll({ profileId: 'abc', startDate: '2024-01-01', endDate: '2024-12-31' });

    const url = (api.get as any).mock.calls[0][0];
    expect(url).toContain('profileId=abc');
    expect(url).toContain('startDate=2024-01-01');
    expect(url).toContain('endDate=2024-12-31');
  });

  it('create posts a new cleaning record', async () => {
    const dto = { cageIds: [1, 2], notes: 'Limpieza general' };
    const mockCleanings = [{ id: 1 }, { id: 2 }];
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, cleanings: mockCleanings } });

    const { cleaningService } = await import('@/modules/cleaning/services/cleaning.service');
    const result = await cleaningService.create(dto as any);

    expect(api.post).toHaveBeenCalledWith('/cleanings', dto);
    expect(result).toEqual(mockCleanings);
  });
});
