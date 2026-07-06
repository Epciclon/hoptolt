import { useState } from 'react';
import { reportsService } from '../services/reports.service';
import { ReportFilterParams } from '../types/reports.types';

export function useReports(onToast: (msg: string, type?: 'success' | 'error') => void) {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const fetchPreview = async (params: ReportFilterParams) => {
    if (!params.galponId) return;
    
    setLoading(true);
    try {
      const data = await reportsService.getReportPreview(params);
      setPreviewData(data);
      
      if (data.length === 0) {
        onToast('No se encontraron registros para los filtros seleccionados', 'error');
      } else {
        onToast(`Vista previa generada (${data.length} registros)`, 'success');
      }
    } catch (error: any) {
      console.error('Error fetching preview:', error);
      onToast(error.message || 'Error al generar la vista previa del reporte', 'error');
      setPreviewData([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    previewData,
    setPreviewData,
    fetchPreview,
  };
}
