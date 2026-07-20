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

vi.mock('@/modules/reports/types/reports.types', () => ({
  REPORT_MODULES: [
    { id: 'feeding', endpoint: '/feedings', label: 'Alimentación' },
    { id: 'vaccination', endpoint: '/vaccinations', label: 'Vacunación' },
    { id: 'deworming', endpoint: '/dewormings', label: 'Desparasitación' },
    { id: 'cleaning', endpoint: '/cleanings', label: 'Limpieza' },
    { id: 'mortality', endpoint: '/mortalities', label: 'Mortalidad' },
    { id: 'reproduction', endpoint: '/reproductions', label: 'Reproducción' },
  ],
}));

describe('reportsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getReportPreview fetches feeding report', async () => {
    const mockFeedings = [{ id: 1, rabbit: 'Test' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, feedings: mockFeedings } });

    const { reportsService } = await import('@/modules/reports/services/reports.service');
    const result = await reportsService.getReportPreview({ module: 'feeding', startDate: '2024-01-01', endDate: '2024-12-31' } as any);

    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/feedings?'));
    expect(result).toEqual(mockFeedings);
  });

  it('getReportPreview fetches vaccination report', async () => {
    const mockVaccinations = [{ id: 1 }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, vaccinations: mockVaccinations } });

    const { reportsService } = await import('@/modules/reports/services/reports.service');
    const result = await reportsService.getReportPreview({ module: 'vaccination' } as any);

    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/vaccinations?'));
    expect(result).toEqual(mockVaccinations);
  });

  it('getReportPreview fetches deworming report', async () => {
    const mockDewormings = [{ id: 1 }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, dewormings: mockDewormings } });

    const { reportsService } = await import('@/modules/reports/services/reports.service');
    const result = await reportsService.getReportPreview({ module: 'deworming' } as any);

    expect(result).toEqual(mockDewormings);
  });

  it('getReportPreview fetches cleaning report', async () => {
    const mockCleanings = [{ id: 1 }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, cleanings: mockCleanings } });

    const { reportsService } = await import('@/modules/reports/services/reports.service');
    const result = await reportsService.getReportPreview({ module: 'cleaning' } as any);

    expect(result).toEqual(mockCleanings);
  });

  it('getReportPreview fetches mortality report', async () => {
    const mockMortalities = [{ id: 1 }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, mortalities: mockMortalities } });

    const { reportsService } = await import('@/modules/reports/services/reports.service');
    const result = await reportsService.getReportPreview({ module: 'mortality' } as any);

    expect(result).toEqual(mockMortalities);
  });

  it('getReportPreview fetches reproduction report', async () => {
    const mockReproductions = [{ id: 1, status: 'completado' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, reproductions: mockReproductions } });

    const { reportsService } = await import('@/modules/reports/services/reports.service');
    const result = await reportsService.getReportPreview({ module: 'reproduction' } as any);

    expect(result).toEqual(mockReproductions);
  });

  it('throws error for invalid module', async () => {
    const { reportsService } = await import('@/modules/reports/services/reports.service');
    await expect(reportsService.getReportPreview({ module: 'invalid' } as any)).rejects.toThrow('Módulo no válido');
  });

  it('passes query parameters correctly', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, feedings: [] } });

    const { reportsService } = await import('@/modules/reports/services/reports.service');
    await reportsService.getReportPreview({
      module: 'feeding',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      profileId: 'user-1',
      races: 'Raza1',
    } as any);

    const url = (api.get as any).mock.calls[0][0];
    expect(url).toContain('all=true');
    expect(url).toContain('startDate=2024-01-01');
    expect(url).toContain('endDate=2024-12-31');
    expect(url).toContain('profileId=user-1');
  });
});
