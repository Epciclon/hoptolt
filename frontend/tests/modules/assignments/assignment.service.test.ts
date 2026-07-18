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

describe('assignmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll fetches all assignments', async () => {
    const mockAssignments = [{ id: 1, rabbitId: 1, cageId: 101 }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, assignments: mockAssignments } });

    const { assignmentService } = await import('@/modules/assignments/services/assignment.service');
    const result = await assignmentService.getAll();

    expect(api.get).toHaveBeenCalledWith('/assignments');
    expect(result).toEqual(mockAssignments);
  });

  it('getAssignedRabbits returns assigned rabbits', async () => {
    const mockRabbits = [{ id: 1, code: 'R001', cageNumber: 101 }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, rabbits: mockRabbits } });

    const { assignmentService } = await import('@/modules/assignments/services/assignment.service');
    const result = await assignmentService.getAssignedRabbits();

    expect(api.get).toHaveBeenCalledWith('/assignments/assigned-rabbits');
    expect(result).toEqual(mockRabbits);
  });

  it('getAvailableRabbits returns unassigned rabbits', async () => {
    const mockRabbits = [{ id: 2, code: 'R002' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, rabbits: mockRabbits } });

    const { assignmentService } = await import('@/modules/assignments/services/assignment.service');
    const result = await assignmentService.getAvailableRabbits();

    expect(api.get).toHaveBeenCalledWith('/assignments/available-rabbits');
    expect(result).toEqual(mockRabbits);
  });

  it('getOperativeCages returns available cages', async () => {
    const mockCages = [{ id: 101, number: 101 }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, cages: mockCages } });

    const { assignmentService } = await import('@/modules/assignments/services/assignment.service');
    const result = await assignmentService.getOperativeCages();

    expect(api.get).toHaveBeenCalledWith('/assignments/operative-cages');
    expect(result).toEqual(mockCages);
  });

  it('assign posts a new assignment', async () => {
    const dto = { rabbitIds: [1, 2], cageId: 101 };
    const mockResponse = { assignments: [{ id: 1 }, { id: 2 }], warnings: [] };
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, ...mockResponse } });

    const { assignmentService } = await import('@/modules/assignments/services/assignment.service');
    const result = await assignmentService.assign(dto as any);

    expect(api.post).toHaveBeenCalledWith('/assignments', dto);
    expect(result.assignments).toHaveLength(2);
    expect(result.warnings).toEqual([]);
  });

  it('deleteById removes an assignment', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });

    const { assignmentService } = await import('@/modules/assignments/services/assignment.service');
    await assignmentService.deleteById(1);

    expect(api.delete).toHaveBeenCalledWith('/assignments/1');
  });
});
