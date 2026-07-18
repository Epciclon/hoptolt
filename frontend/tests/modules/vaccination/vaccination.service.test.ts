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

describe('vaccinationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll fetches vaccinations with filters', async () => {
    const mockVaccinations = [{ id: 1, rabbitId: 1, vaccineType: 'mixomatosis' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, vaccinations: mockVaccinations } });

    const { vaccinationService } = await import('@/modules/vaccination/services/vaccination.service');
    const result = await vaccinationService.getAll();

    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/vaccinations?'));
    expect(result).toEqual(mockVaccinations);
  });

  it('getAll passes filters as query params', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, vaccinations: [] } });

    const { vaccinationService } = await import('@/modules/vaccination/services/vaccination.service');
    await vaccinationService.getAll({ profileId: 'abc', startDate: '2024-01-01', endDate: '2024-12-31' });

    const url = (api.get as vi.Mock).mock.calls[0][0];
    expect(url).toContain('profileId=abc');
    expect(url).toContain('startDate=2024-01-01');
    expect(url).toContain('endDate=2024-12-31');
  });

  it('create posts vaccinations', async () => {
    const dto = { rabbitIds: [1, 2], vaccineType: 'mixomatosis', applicationDate: '2024-03-15' };
    const mockVaccinations = [{ id: 1 }, { id: 2 }];
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, vaccinations: mockVaccinations } });

    const { vaccinationService } = await import('@/modules/vaccination/services/vaccination.service');
    const result = await vaccinationService.create(dto as any);

    expect(api.post).toHaveBeenCalledWith('/vaccinations', dto);
    expect(result).toEqual(mockVaccinations);
  });

  it('getGalponVaccines returns vaccine list', async () => {
    const mockVaccines = [{ id: 1, name: 'Mixomatosis' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, vaccines: mockVaccines } });

    const { vaccinationService } = await import('@/modules/vaccination/services/vaccination.service');
    const result = await vaccinationService.getGalponVaccines();

    expect(api.get).toHaveBeenCalledWith('/vaccines');
    expect(result).toEqual(mockVaccines);
  });
});
