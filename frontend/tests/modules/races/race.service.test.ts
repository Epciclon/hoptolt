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

describe('raceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll fetches races with pagination', async () => {
    const mockResponse = { success: true, races: [{ id: 1, name: 'Nueva Zelanda' }], pagination: { total: 1, page: 1, limit: 12, totalPages: 1 } };
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse });

    const { raceService } = await import('@/modules/races/services/race.service');
    const result = await raceService.getAll({ page: 1, limit: 12, search: 'Nueva' });

    expect(api.get).toHaveBeenCalledWith('/races', { params: { page: 1, limit: 12, search: 'Nueva' } });
    expect(result).toEqual({ races: mockResponse.races, pagination: mockResponse.pagination });
  });

  it('getById fetches a race by id', async () => {
    const mockRace = { id: 1, name: 'Nueva Zelanda' };
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, race: mockRace } });

    const { raceService } = await import('@/modules/races/services/race.service');
    const result = await raceService.getById(1);

    expect(api.get).toHaveBeenCalledWith('/races/1');
    expect(result).toEqual(mockRace);
  });

  it('create posts a new race', async () => {
    const dto = { name: 'California', description: 'Buena raza' };
    const mockRace = { id: 2, ...dto };
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, race: mockRace } });

    const { raceService } = await import('@/modules/races/services/race.service');
    const result = await raceService.create(dto as any);

    expect(api.post).toHaveBeenCalledWith('/races', dto);
    expect(result).toEqual(mockRace);
  });

  it('update modifies a race', async () => {
    const dto = { name: 'Updated Race' };
    vi.mocked(api.put).mockResolvedValue({ data: { success: true, race: { id: 1, ...dto } } });

    const { raceService } = await import('@/modules/races/services/race.service');
    const result = await raceService.update(1, dto as any);

    expect(api.put).toHaveBeenCalledWith('/races/1', dto);
    expect(result.name).toBe('Updated Race');
  });

  it('delete removes a race', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });

    const { raceService } = await import('@/modules/races/services/race.service');
    await raceService.delete(1);

    expect(api.delete).toHaveBeenCalledWith('/races/1');
  });
});
