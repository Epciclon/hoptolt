import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '@/lib/api';
import { incidentService } from '@/modules/incident/services/incident.service';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

describe('incidentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches paginated incidents via getAll', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        incidents: [{ id: 1, title: 'Falta alimento', status: 'pending' }],
        pagination: { total: 1, page: 1, limit: 12, totalPages: 1 },
        userRole: 'owner',
      },
    });

    const result = await incidentService.getAll({ page: 1 });
    expect(mockedApi.get).toHaveBeenCalledWith('/incidents', { params: { page: 1 } });
    expect(result.incidents).toHaveLength(1);
    expect(result.userRole).toBe('owner');
  });

  it('fetches incident counts via getCounts', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        counts: { unread: 2, pending: 1, resolved: 4 },
      },
    });

    const counts = await incidentService.getCounts();
    expect(mockedApi.get).toHaveBeenCalledWith('/incidents/counts');
    expect(counts.unread).toBe(2);
  });

  it('creates a new incident via create', async () => {
    const payload = {
      module: 'alimentacion',
      cageIds: [1, 2],
      category: 'Falta de Insumos',
      title: 'Sin balanceado',
      description: 'Se terminó el saco del turno tarde',
    };
    mockedApi.post.mockResolvedValue({
      data: {
        success: true,
        incident: { id: 5, ...payload, status: 'pending' },
      },
    });

    const created = await incidentService.create(payload);
    expect(mockedApi.post).toHaveBeenCalledWith('/incidents', payload);
    expect(created.id).toBe(5);
  });

  it('responds to an incident via respond', async () => {
    mockedApi.put.mockResolvedValue({
      data: {
        success: true,
        incident: { id: 5, ownerResponse: 'Ya se compró alimento', status: 'resolved' },
      },
    });

    const updated = await incidentService.respond(5, { ownerResponse: 'Ya se compró alimento', status: 'resolved' });
    expect(mockedApi.put).toHaveBeenCalledWith('/incidents/5/respond', {
      ownerResponse: 'Ya se compró alimento',
      status: 'resolved',
    });
    expect(updated.status).toBe('resolved');
  });

  it('marks an incident as read via markAsRead', async () => {
    mockedApi.put.mockResolvedValue({ data: { success: true } });
    const res = await incidentService.markAsRead(5);
    expect(mockedApi.put).toHaveBeenCalledWith('/incidents/5/read');
    expect(res.success).toBe(true);
  });

  it('deletes an incident via delete', async () => {
    mockedApi.delete.mockResolvedValue({ data: { success: true, message: 'Eliminada' } });
    const res = await incidentService.delete(5);
    expect(mockedApi.delete).toHaveBeenCalledWith('/incidents/5');
    expect(res.success).toBe(true);
  });
});
