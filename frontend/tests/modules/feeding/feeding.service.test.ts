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

describe('feedingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll fetches feedings with filters', async () => {
    const mockFeedings = [{ id: 1, foodType: 'heno' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, feedings: mockFeedings } });

    const { feedingService } = await import('@/modules/feeding/services/feeding.service');
    const result = await feedingService.getAll();

    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/feedings?'));
    expect(result).toEqual(mockFeedings);
  });

  it('getAll passes optional filters', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, feedings: [] } });

    const { feedingService } = await import('@/modules/feeding/services/feeding.service');
    await feedingService.getAll({ profileId: 'abc', startDate: '2024-01-01', endDate: '2024-12-31' });

    const url = (api.get as vi.Mock).mock.calls[0][0];
    expect(url).toContain('profileId=abc');
    expect(url).toContain('startDate=2024-01-01');
    expect(url).toContain('endDate=2024-12-31');
  });

  it('getFoodTypes returns list of food types', async () => {
    const mockFoodTypes = ['heno', 'pellets', 'verduras'];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, foodTypes: mockFoodTypes } });

    const { feedingService } = await import('@/modules/feeding/services/feeding.service');
    const result = await feedingService.getFoodTypes();

    expect(api.get).toHaveBeenCalledWith('/feedings/food-types');
    expect(result).toEqual(mockFoodTypes);
  });

  it('create posts a new feeding record', async () => {
    const dto = { cageIds: [1, 2], foodType: 'heno', amount: 5 };
    const mockFeedings = [{ id: 1 }, { id: 2 }];
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, feedings: mockFeedings } });

    const { feedingService } = await import('@/modules/feeding/services/feeding.service');
    const result = await feedingService.create(dto as any);

    expect(api.post).toHaveBeenCalledWith('/feedings', dto);
    expect(result).toEqual(mockFeedings);
  });
});
