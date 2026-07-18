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

describe('cageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll fetches cages with pagination', async () => {
    const mockResponse = { success: true, cages: [{ id: 1, number: 101 }], pagination: { total: 1, page: 1, limit: 12, totalPages: 1 } };
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse });

    const { cageService } = await import('@/modules/cages/services/cage.service');
    const result = await cageService.getAll({ page: 1, limit: 12 });

    expect(api.get).toHaveBeenCalledWith('/cages', { params: { page: 1, limit: 12 } });
    expect(result).toEqual({ cages: mockResponse.cages, pagination: mockResponse.pagination });
  });

  it('getById fetches a single cage', async () => {
    const mockCage = { id: 1, number: 101 };
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, cage: mockCage } });

    const { cageService } = await import('@/modules/cages/services/cage.service');
    const result = await cageService.getById(1);

    expect(api.get).toHaveBeenCalledWith('/cages/1');
    expect(result).toEqual(mockCage);
  });

  it('create posts a new cage', async () => {
    const dto = { number: 102, type: 'engorde' as const };
    const mockCage = { id: 2, ...dto };
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, cage: mockCage } });

    const { cageService } = await import('@/modules/cages/services/cage.service');
    const result = await cageService.create(dto as any);

    expect(api.post).toHaveBeenCalledWith('/cages', dto);
    expect(result).toEqual(mockCage);
  });

  it('update modifies a cage', async () => {
    const dto = { type: 'reproducción' as const };
    const mockCage = { id: 1, type: 'reproducción' };
    vi.mocked(api.put).mockResolvedValue({ data: { success: true, cage: mockCage } });

    const { cageService } = await import('@/modules/cages/services/cage.service');
    const result = await cageService.update(1, dto as any);

    expect(api.put).toHaveBeenCalledWith('/cages/1', dto);
    expect(result).toEqual(mockCage);
  });

  it('delete removes a cage', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });

    const { cageService } = await import('@/modules/cages/services/cage.service');
    await cageService.delete(1);

    expect(api.delete).toHaveBeenCalledWith('/cages/1');
  });
});
