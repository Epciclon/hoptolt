import api from '@/lib/api';
import { ReportFilterParams, REPORT_MODULES } from '../types/reports.types';

// ─── Helper: Complexity extracted from getReportPreview ──────────────────────

interface ReproStatusInfo {
  reproStatus: string;
  includesParcial: boolean;
}

/**
 * Builds query params and derives reproduction-specific status metadata.
 * Complexity: ~5 (well under the 15 limit).
 */
function buildQueryParams(params: ReportFilterParams): { queryParams: URLSearchParams; reproInfo: ReproStatusInfo } {
  const { module, startDate, endDate, races, status, profileId, cageType } = params;

  const queryParams = new URLSearchParams();
  queryParams.append('all', 'true');
  queryParams.append('limit', '5000');

  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  if (races && ['feeding', 'vaccination', 'deworming', 'mortality', 'reproduction'].includes(module)) {
    queryParams.append('races', races);
  }
  if (profileId) queryParams.append('profileId', profileId);
  if (cageType && ['feeding', 'cleaning'].includes(module)) queryParams.append('cageType', cageType);
  if (module === 'mortality') queryParams.append('isKits', 'false');

  let reproStatus = '';
  let includesParcial = false;

  if (status && module === 'reproduction' && status !== 'todas') {
    const statuses = status.split(',');
    includesParcial = statuses.includes('parcial');
    const otherStatuses = statuses.filter(s => s !== 'parcial');

    if (otherStatuses.length > 0) {
      const statusStr = otherStatuses.join(',');
      queryParams.append('status', statusStr);
      reproStatus = statusStr;
    } else if (includesParcial) {
      reproStatus = 'parcial';
    }
  }

  return { queryParams, reproInfo: { reproStatus, includesParcial } };
}

/** Maps a module id to the response property key that holds the records array. */
function extractData(module: string, data: Record<string, any>): any[] | null {
  switch (module) {
    case 'feeding': return data.feedings || [];
    case 'vaccination': return data.vaccinations || [];
    case 'deworming': return data.dewormings || [];
    case 'cleaning': return data.cleanings || [];
    case 'mortality': return data.mortalities || [];
    default: return null; // 'reproduction' handled separately
  }
}

/**
 * Fetches kit mortalities and maps them into reproduction-shaped records
 * so they can be merged with reproduction results as 'parcial' status rows.
 * Complexity: ~4.
 */
async function fetchPartialMortalities(queryParams: URLSearchParams, reproductions: any[]): Promise<any[]> {
  const mortParams = new URLSearchParams(queryParams.toString());
  mortParams.set('isKits', 'true');
  mortParams.delete('status');

  try {
    const { data: mortData } = await api.get<{ [key: string]: any }>(`/mortalities?${mortParams.toString()}`);
    return (mortData.mortalities || []).map((m: any) => {
      const lastRep = reproductions
        .filter((r: any) => r.femaleId === m.rabbitId || r.femaleCode === m.rabbitCode)
        .sort((a: any, b: any) => new Date(b.mountDate).getTime() - new Date(a.mountDate).getTime())[0];

      return {
        ...m,
        type: 'mortality',
        status: 'parcial',
        mountDate: m.deathDate,
        femaleCode: m.rabbitCode || m.rabbit?.code,
        femaleName: m.rabbitName || m.rabbit?.name,
        femaleRace: m.rabbitRace || m.rabbit?.race,
        maleCode: lastRep?.maleCode ?? null,
        maleName: lastRep?.maleName || '',
        maleRace: lastRep?.maleRace || '',
        cageNumber: lastRep?.cageNumber ?? null,
        cancellationReason: m.cause,
        observations: m.observations,
        bornKits: m.numberOfKits,
        profileName: m.profileName || m.responsible || m.profile?.fullName,
        profile: m.profile ?? {
          fullName: m.responsible || 'N/A',
          username: '',
          email: ''
        }
      };
    });
  } catch (e) {
    console.error('Failed to fetch partial mortalities for report', e);
    return [];
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const reportsService = {
  /** Complexity: ~4 — orchestration only, all logic delegated to helpers. */
  async getReportPreview(params: ReportFilterParams): Promise<any[]> {
    const moduleConfig = REPORT_MODULES.find(m => m.id === params.module);
    if (!moduleConfig) throw new Error('Módulo no válido');

    const { queryParams, reproInfo } = buildQueryParams(params);
    const { data } = await api.get<{ [key: string]: any }>(
      `${moduleConfig.endpoint}?${queryParams.toString()}`
    );

    const simple = extractData(params.module, data);
    if (simple !== null) return simple;

    // Reproduction module — may need to merge partial (kit) mortalities
    let reproductions: any[] = data.reproductions || [];
    const { reproStatus, includesParcial } = reproInfo;
    const needsPartials = !reproStatus || reproStatus === 'parcial' || reproStatus === 'todas' || includesParcial;

    if (needsPartials) {
      const mortalities = await fetchPartialMortalities(queryParams, reproductions);
      reproductions = reproStatus === 'parcial'
        ? mortalities
        : [...reproductions, ...mortalities];
    }

    return reproductions;
  }
};
