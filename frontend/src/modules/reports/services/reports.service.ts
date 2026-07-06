import api from '@/lib/api';
import { ReportFilterParams, REPORT_MODULES } from '../types/reports.types';

export const reportsService = {
  async getReportPreview(params: ReportFilterParams): Promise<any[]> {
    const { module, startDate, endDate, races, status, causes, profileId, cageType } = params;
    const moduleConfig = REPORT_MODULES.find(m => m.id === module);
    
    if (!moduleConfig) throw new Error('Módulo no válido');

    const queryParams = new URLSearchParams();
    queryParams.append('all', 'true');
    queryParams.append('limit', '5000'); // Ensure we fetch enough records for the report
    
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    if (races && ['feeding', 'vaccination', 'deworming', 'mortality', 'reproduction'].includes(module)) {
        queryParams.append('races', races);
    }
    // Extraer el status si existe para evitar que vaya al endpoint general si no es soportado
    let reproStatus = '';
    let includesParcial = false;
    if (status && module === 'reproduction') {
        if (status === 'todas') {
            // Do not append status
        } else {
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
    }
    if (profileId) {
        queryParams.append('profileId', profileId);
    }
    if (cageType && ['feeding', 'cleaning'].includes(module)) {
        queryParams.append('cageType', cageType);
    }
    if (module === 'mortality') {
        queryParams.append('isKits', 'false');
    }

    const { data } = await api.get<{ [key: string]: any }>(
      `${moduleConfig.endpoint}?${queryParams.toString()}`
    );

    // Extract the array correctly based on the module's response structure
    if (module === 'feeding') return data.feedings || [];
    if (module === 'vaccination') return data.vaccinations || [];
    if (module === 'deworming') return data.dewormings || [];
    if (module === 'cleaning') return data.cleanings || [];
    if (module === 'mortality') return data.mortalities || [];
    if (module === 'reproduction') {
      let reproductions = data.reproductions || [];
      
      if (!reproStatus || reproStatus === 'parcial' || reproStatus === 'todas' || includesParcial) {
        const mortParams = new URLSearchParams(queryParams.toString());
        mortParams.set('isKits', 'true');
        mortParams.delete('status');
        
        try {
          const { data: mortData } = await api.get<{ [key: string]: any }>(`/mortalities?${mortParams.toString()}`);
          const mortalities = (mortData.mortalities || []).map((m: any) => {
            const lastRep = reproductions
              .filter((r: any) => (r.femaleId === m.rabbitId || r.femaleCode === m.rabbitCode))
              .sort((a: any, b: any) => new Date(b.mountDate).getTime() - new Date(a.mountDate).getTime())[0];

            return {
              ...m,
              type: 'mortality',
              status: 'parcial',
              mountDate: m.deathDate,
              femaleCode: m.rabbitCode || m.rabbit?.code,
              femaleName: m.rabbitName || m.rabbit?.name,
              femaleRace: m.rabbitRace || m.rabbit?.race,
              maleCode: lastRep?.maleCode || null,
              maleName: lastRep?.maleName || '',
              maleRace: lastRep?.maleRace || '',
              cageNumber: lastRep?.cageNumber || null,
              cancellationReason: m.cause,
              observations: m.observations,
              bornKits: m.numberOfKits,
              profileName: m.profileName || m.responsible || m.profile?.fullName,
              profile: m.profile || {
                  fullName: m.responsible || 'N/A',
                  username: '',
                  email: ''
              }
            };
          });
          
          if (reproStatus === 'parcial') {
            reproductions = mortalities;
          } else {
            reproductions = [...reproductions, ...mortalities];
          }
        } catch (e) {
          console.error("Failed to fetch partial mortalities for report", e);
        }
      }
      return reproductions;
    }

    return [];
  }
};
