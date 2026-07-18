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

describe('reproductionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll fetches reproductions with filters', async () => {
    const mockResponse = { success: true, reproductions: [{ id: 1 }], pagination: { total: 1 } };
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse });

    const { reproductionService } = await import('@/modules/reproduction/services/reproduction.service');
    const result = await reproductionService.getAll({ page: 1, limit: 10, status: 'active' });

    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/reproductions?'));
    expect(result.reproductions).toEqual(mockResponse.reproductions);
  });

  it('create starts a new reproduction', async () => {
    const dto = { maleId: 1, femaleId: 2 };
    const mockReproduction = { id: 1, ...dto };
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, reproduction: mockReproduction } });

    const { reproductionService } = await import('@/modules/reproduction/services/reproduction.service');
    const result = await reproductionService.create(dto as any);

    expect(api.post).toHaveBeenCalledWith('/reproductions', dto);
    expect(result).toEqual(mockReproduction);
  });

  it('update modifies a reproduction', async () => {
    const dto = { status: 'completed' };
    vi.mocked(api.put).mockResolvedValue({ data: { success: true, reproduction: { id: 1, ...dto } } });

    const { reproductionService } = await import('@/modules/reproduction/services/reproduction.service');
    const result = await reproductionService.update(1, dto as any);

    expect(api.put).toHaveBeenCalledWith('/reproductions/1', dto);
    expect(result.status).toBe('completed');
  });

  it('delete removes a reproduction', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });

    const { reproductionService } = await import('@/modules/reproduction/services/reproduction.service');
    await reproductionService.delete(1);

    expect(api.delete).toHaveBeenCalledWith('/reproductions/1');
  });

  it('getAvailableMalesForMating returns males', async () => {
    const mockMales = [{ id: 1, code: 'M001' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, males: mockMales } });

    const { reproductionService } = await import('@/modules/reproduction/services/reproduction.service');
    const result = await reproductionService.getAvailableMalesForMating();

    expect(api.get).toHaveBeenCalledWith('/reproductions/males-for-mating');
    expect(result).toEqual(mockMales);
  });

  it('getAvailableFemalesForMating returns females', async () => {
    const mockFemales = [{ id: 2, code: 'F001' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, females: mockFemales } });

    const { reproductionService } = await import('@/modules/reproduction/services/reproduction.service');
    const result = await reproductionService.getAvailableFemalesForMating(1);

    expect(api.get).toHaveBeenCalledWith('/reproductions/females-for-mating/1');
    expect(result).toEqual(mockFemales);
  });

  it('startMating begins mating process', async () => {
    const dto = { maleId: 1, femaleId: 2 };
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, reproduction: { id: 1 } } });

    const { reproductionService } = await import('@/modules/reproduction/services/reproduction.service');
    const result = await reproductionService.startMating(dto as any);

    expect(api.post).toHaveBeenCalledWith('/reproductions/start-mating', dto);
    expect(result.id).toBe(1);
  });

  it('finishMating completes mating', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, reproduction: { id: 1, status: 'mated' } } });

    const { reproductionService } = await import('@/modules/reproduction/services/reproduction.service');
    const result = await reproductionService.finishMating(1);

    expect(api.post).toHaveBeenCalledWith('/reproductions/1/finish-mating');
    expect(result.status).toBe('mated');
  });

  it('getCalendar returns calendar data', async () => {
    const mockCalendar = { '2024-03-15': [{ id: 1 }] };
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, calendar: mockCalendar } });

    const { reproductionService } = await import('@/modules/reproduction/services/reproduction.service');
    const result = await reproductionService.getCalendar(2024, 3);

    expect(api.get).toHaveBeenCalledWith('/reproductions/calendar', { params: { year: 2024, month: 3, type: 'births' } });
    expect(result).toEqual(mockCalendar);
  });
});
