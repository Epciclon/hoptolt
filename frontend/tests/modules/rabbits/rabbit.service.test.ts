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

describe('rabbitService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll fetches rabbits with pagination', async () => {
    const mockResponse = { success: true, rabbits: [{ id: 1, code: 'R001' }], pagination: { total: 1, page: 1, limit: 12, totalPages: 1 } };
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse });

    const { rabbitService } = await import('@/modules/rabbits/services/rabbit.service');
    const result = await rabbitService.getAll({ page: 1, limit: 12 });

    expect(api.get).toHaveBeenCalledWith('/rabbits', { params: { page: 1, limit: 12 } });
    expect(result).toEqual({ rabbits: mockResponse.rabbits, pagination: mockResponse.pagination });
  });

  it('getById fetches a rabbit by id', async () => {
    const mockRabbit = { id: 1, code: 'R001' };
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, rabbit: mockRabbit } });

    const { rabbitService } = await import('@/modules/rabbits/services/rabbit.service');
    const result = await rabbitService.getById(1);

    expect(api.get).toHaveBeenCalledWith('/rabbits/1');
    expect(result).toEqual(mockRabbit);
  });

  it('create posts a new rabbit', async () => {
    const dto = { name: 'Test', code: 'R002', sex: 'macho', birthDate: '2024-01-01', raceId: 1 };
    const mockRabbit = { id: 2, ...dto };
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, rabbit: mockRabbit } });

    const { rabbitService } = await import('@/modules/rabbits/services/rabbit.service');
    const result = await rabbitService.create(dto as any);

    expect(api.post).toHaveBeenCalledWith('/rabbits', dto);
    expect(result).toEqual(mockRabbit);
  });

  it('update modifies a rabbit', async () => {
    const dto = { name: 'Updated' };
    const mockRabbit = { id: 1, name: 'Updated' };
    vi.mocked(api.put).mockResolvedValue({ data: { success: true, rabbit: mockRabbit } });

    const { rabbitService } = await import('@/modules/rabbits/services/rabbit.service');
    const result = await rabbitService.update(1, dto as any);

    expect(api.put).toHaveBeenCalledWith('/rabbits/1', dto);
    expect(result).toEqual(mockRabbit);
  });

  it('delete removes a rabbit', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });

    const { rabbitService } = await import('@/modules/rabbits/services/rabbit.service');
    await rabbitService.delete(1);

    expect(api.delete).toHaveBeenCalledWith('/rabbits/1');
  });

  it('getPotentialFathers returns list of male rabbits', async () => {
    const mockFathers = [{ id: 1, code: 'M001' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, fathers: mockFathers } });

    const { rabbitService } = await import('@/modules/rabbits/services/rabbit.service');
    const result = await rabbitService.getPotentialFathers();

    expect(api.get).toHaveBeenCalledWith('/rabbits/potential-fathers');
    expect(result).toEqual(mockFathers);
  });

  it('getPotentialMothers returns list of female rabbits', async () => {
    const mockMothers = [{ id: 2, code: 'F001' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, mothers: mockMothers } });

    const { rabbitService } = await import('@/modules/rabbits/services/rabbit.service');
    const result = await rabbitService.getPotentialMothers();

    expect(api.get).toHaveBeenCalledWith('/rabbits/potential-mothers');
    expect(result).toEqual(mockMothers);
  });

  it('getByCode finds rabbit by code', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, rabbits: [{ id: 1, code: 'R001' }] } });

    const { rabbitService } = await import('@/modules/rabbits/services/rabbit.service');
    const result = await rabbitService.getByCode('R001');

    expect(api.get).toHaveBeenCalledWith('/rabbits');
    expect(result.code).toBe('R001');
  });

  it('getByCode throws when rabbit not found', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, rabbits: [] } });

    const { rabbitService } = await import('@/modules/rabbits/services/rabbit.service');
    await expect(rabbitService.getByCode('NONEXIST')).rejects.toThrow('Conejo no encontrado');
  });

  it('suggestName returns a suggested name', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, name: 'Thumper' } });

    const { rabbitService } = await import('@/modules/rabbits/services/rabbit.service');
    const result = await rabbitService.suggestName('macho');

    expect(api.get).toHaveBeenCalledWith('/rabbits/suggest-name', { params: { sex: 'macho' } });
    expect(result).toBe('Thumper');
  });
});
