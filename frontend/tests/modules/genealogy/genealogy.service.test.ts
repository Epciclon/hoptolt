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

describe('genealogyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('register posts a new genealogy record', async () => {
    const dto = { rabbitId: 1, fatherId: 2, motherId: 3 };
    const mockGenealogy = { id: 1, ...dto };
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, genealogy: mockGenealogy } });

    const { genealogyService } = await import('@/modules/genealogy/services/genealogy.service');
    const result = await genealogyService.register(dto as any);

    expect(api.post).toHaveBeenCalledWith('/genealogies', dto);
    expect(result).toEqual(mockGenealogy);
  });

  it('getByRabbitId fetches genealogy by rabbit id', async () => {
    const mockGenealogy = { id: 1, rabbitId: 5 };
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, genealogy: mockGenealogy } });

    const { genealogyService } = await import('@/modules/genealogy/services/genealogy.service');
    const result = await genealogyService.getByRabbitId(5);

    expect(api.get).toHaveBeenCalledWith('/genealogies/5');
    expect(result).toEqual(mockGenealogy);
  });

  it('getAll fetches all genealogies', async () => {
    const mockGenealogies = [{ id: 1 }, { id: 2 }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, genealogies: mockGenealogies } });

    const { genealogyService } = await import('@/modules/genealogy/services/genealogy.service');
    const result = await genealogyService.getAll();

    expect(api.get).toHaveBeenCalledWith('/genealogies');
    expect(result).toEqual(mockGenealogies);
  });

  it('getTree fetches genealogy tree', async () => {
    const mockTree = { rabbit: { id: 1 }, parents: [] };
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, tree: mockTree } });

    const { genealogyService } = await import('@/modules/genealogy/services/genealogy.service');
    const result = await genealogyService.getTree(1, 3);

    expect(api.get).toHaveBeenCalledWith('/genealogies/1/tree', { params: { levels: 3 } });
    expect(result).toEqual(mockTree);
  });

  it('edit updates a genealogy record', async () => {
    const dto = { fatherId: 4 };
    vi.mocked(api.put).mockResolvedValue({ data: { success: true, genealogy: { id: 1, fatherId: 4 } } });

    const { genealogyService } = await import('@/modules/genealogy/services/genealogy.service');
    const result = await genealogyService.edit(1, dto as any);

    expect(api.put).toHaveBeenCalledWith('/genealogies/1', dto);
    expect(result.fatherId).toBe(4);
  });

  it('checkConsanguinity checks if two rabbits are related', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, areRelated: true } });

    const { genealogyService } = await import('@/modules/genealogy/services/genealogy.service');
    const result = await genealogyService.checkConsanguinity(1, 2);

    expect(api.get).toHaveBeenCalledWith('/genealogies/check-consanguinity/1/2');
    expect(result).toBe(true);
  });
});
