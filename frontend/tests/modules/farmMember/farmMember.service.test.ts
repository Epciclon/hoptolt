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

describe('farmMemberService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getMyMemberships returns current user memberships', async () => {
    const mockMemberships = [{ id: 1, galponId: 1, role: 'Trabajador' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, memberships: mockMemberships } });

    const { farmMemberService } = await import('@/modules/farmMember/services/farmMember.service');
    const result = await farmMemberService.getMyMemberships();

    expect(api.get).toHaveBeenCalledWith('/farm-members/me');
    expect(result).toEqual(mockMemberships);
  });

  it('getWorkersByGalpon fetches workers for a galpon', async () => {
    const mockWorkers = [{ id: 2, fullName: 'Juan' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, workers: mockWorkers } });

    const { farmMemberService } = await import('@/modules/farmMember/services/farmMember.service');
    const result = await farmMemberService.getWorkersByGalpon(1);

    expect(api.get).toHaveBeenCalledWith('/galpones/1/workers');
    expect(result).toEqual(mockWorkers);
  });

  it('getAllMembersByGalpon fetches all members', async () => {
    const mockMembers = [{ id: 1, fullName: 'Admin' }, { id: 2, fullName: 'Worker' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, members: mockMembers } });

    const { farmMemberService } = await import('@/modules/farmMember/services/farmMember.service');
    const result = await farmMemberService.getAllMembersByGalpon(1);

    expect(api.get).toHaveBeenCalledWith('/galpones/1/members');
    expect(result).toEqual(mockMembers);
  });

  it('getWorkerById fetches a single worker', async () => {
    const mockWorker = { id: 2, fullName: 'Juan' };
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, worker: mockWorker } });

    const { farmMemberService } = await import('@/modules/farmMember/services/farmMember.service');
    const result = await farmMemberService.getWorkerById(2);

    expect(api.get).toHaveBeenCalledWith('/farm-members/2');
    expect(result).toEqual(mockWorker);
  });

  it('updateWorker modifies a worker', async () => {
    const dto = { role: 'Administrador' };
    const mockWorker = { id: 2, role: 'Administrador' };
    vi.mocked(api.put).mockResolvedValue({ data: { success: true, worker: mockWorker } });

    const { farmMemberService } = await import('@/modules/farmMember/services/farmMember.service');
    const result = await farmMemberService.updateWorker(2, dto as any);

    expect(api.put).toHaveBeenCalledWith('/farm-members/2', dto);
    expect(result.role).toBe('Administrador');
  });

  it('removeWorker deletes a worker', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });

    const { farmMemberService } = await import('@/modules/farmMember/services/farmMember.service');
    await farmMemberService.removeWorker(2);

    expect(api.delete).toHaveBeenCalledWith('/farm-members/2');
  });
});
