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

describe('mortalityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll fetches mortalities with filters', async () => {
    const mockMortalities = [{ id: 1, rabbitId: 5, cause: 'enfermedad' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, mortalities: mockMortalities } });

    const { mortalityService } = await import('@/modules/mortality/services/mortality.service');
    const result = await mortalityService.getAll();

    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/mortalities?'));
    expect(result).toEqual(mockMortalities);
  });

  it('getAll passes isKits filter', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, mortalities: [] } });

    const { mortalityService } = await import('@/modules/mortality/services/mortality.service');
    await mortalityService.getAll({ isKits: true });

    const url = (api.get as any).mock.calls[0][0];
    expect(url).toContain('isKits=true');
  });

  it('getAll passes optional profile/date filters', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, mortalities: [] } });

    const { mortalityService } = await import('@/modules/mortality/services/mortality.service');
    await mortalityService.getAll({ profileId: 'abc', startDate: '2024-01-01', endDate: '2024-12-31' });

    const url = (api.get as any).mock.calls[0][0];
    expect(url).toContain('profileId=abc');
    expect(url).toContain('startDate=2024-01-01');
    expect(url).toContain('endDate=2024-12-31');
  });

  it('create posts a new mortality record', async () => {
    const dto = { rabbitId: 5, cause: 'enfermedad', deathDate: '2024-03-15' };
    const mockMortality = { id: 1, ...dto };
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, mortality: mockMortality } });

    const { mortalityService } = await import('@/modules/mortality/services/mortality.service');
    const result = await mortalityService.create(dto as any);

    expect(api.post).toHaveBeenCalledWith('/mortalities', dto);
    expect(result).toEqual(mockMortality);
  });
});
