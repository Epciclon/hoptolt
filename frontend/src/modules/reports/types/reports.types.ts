export interface ReportFilterParams {
  galponId: number | string;
  module: string;
  startDate?: string;
  endDate?: string;
  races?: string;
  profileId?: string;
  cageType?: string;
  status?: string;
  causes?: string;
}

export interface ReportModuleConfig {
  id: string;
  label: string;
  endpoint: string;
}

export const REPORT_MODULES: ReportModuleConfig[] = [
  { id: 'feeding', label: 'Alimentación', endpoint: '/feedings' },
  { id: 'vaccination', label: 'Vacunación', endpoint: '/vaccinations' },
  { id: 'deworming', label: 'Desparasitación', endpoint: '/dewormings' },
  { id: 'cleaning', label: 'Limpieza', endpoint: '/cleanings' },
  { id: 'mortality', label: 'Mortalidad', endpoint: '/mortalities' },
  { id: 'reproduction', label: 'Reproducción', endpoint: '/reproductions' }
];
