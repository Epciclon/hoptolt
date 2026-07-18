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

describe('galponService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll fetches all galpones', async () => {
    const mockGalpones = [{ id: 1, name: 'Galpón A' }, { id: 2, name: 'Galpón B' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, galpones: mockGalpones } });

    const { galponService } = await import('@/modules/galpones/services/galpon.service');
    const result = await galponService.getAll();

    expect(api.get).toHaveBeenCalledWith('/galpones');
    expect(result).toEqual(mockGalpones);
  });

  it('getById fetches a single galpon', async () => {
    const mockGalpon = { id: 1, name: 'Galpón A' };
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, galpon: mockGalpon } });

    const { galponService } = await import('@/modules/galpones/services/galpon.service');
    const result = await galponService.getById(1);

    expect(api.get).toHaveBeenCalledWith('/galpones/1');
    expect(result).toEqual(mockGalpon);
  });

  it('create posts a new galpon', async () => {
    const dto = { name: 'Galpón C', capacity: 50 };
    const mockGalpon = { id: 3, ...dto };
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, galpon: mockGalpon } });

    const { galponService } = await import('@/modules/galpones/services/galpon.service');
    const result = await galponService.create(dto as any);

    expect(api.post).toHaveBeenCalledWith('/galpones', dto);
    expect(result).toEqual(mockGalpon);
  });

  it('update modifies a galpon', async () => {
    const dto = { name: 'Updated Galpón' };
    vi.mocked(api.put).mockResolvedValue({ data: { success: true, galpon: { id: 1, ...dto } } });

    const { galponService } = await import('@/modules/galpones/services/galpon.service');
    const result = await galponService.update(1, dto as any);

    expect(api.put).toHaveBeenCalledWith('/galpones/1', dto);
    expect(result.name).toBe('Updated Galpón');
  });

  it('delete removes a galpon', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });

    const { galponService } = await import('@/modules/galpones/services/galpon.service');
    await galponService.delete(1);

    expect(api.delete).toHaveBeenCalledWith('/galpones/1');
  });

  it('getActive returns the active galpon', async () => {
    const mockGalpon = { id: 1, name: 'Active Galpón' };
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, galpon: mockGalpon } });

    const { galponService } = await import('@/modules/galpones/services/galpon.service');
    const result = await galponService.getActive();

    expect(api.get).toHaveBeenCalledWith('/galpones/active');
    expect(result).toEqual(mockGalpon);
  });

  it('setActive posts to set active galpon', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });

    const { galponService } = await import('@/modules/galpones/services/galpon.service');
    await galponService.setActive(1);

    expect(api.post).toHaveBeenCalledWith('/galpones/1/set-active', {});
  });
});
