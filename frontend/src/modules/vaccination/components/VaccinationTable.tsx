'use client';

import { useState } from 'react';
import type { Vaccination } from '../types/vaccination.types';
import { useVaccination } from '../hooks/useVaccination';
import { LoadingMessage, EventDetailsModal } from '@/shared/ui';
import { Table } from '@/shared/ui/Table';
import type { Column } from '@/shared/ui/Table';
import { getRabbitEventBaseColumns } from '@/shared/utils/tableUtils';

interface NextVaccinationData {
  name: string;
  nextDate: Date | null;
  diffDays: number | null;
  period: number | null;
}

function VaccinationCustomDetails({ nextVacs }: Readonly<{ nextVacs: NextVaccinationData[] }>) {
  return (
    <div className="bg-theme-surface border border-strong rounded-lg p-3 col-span-2">
      <p className="text-xs text-muted font-medium mb-3">Seguimiento de Vacuna Aplicada</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {nextVacs.length > 0 ? nextVacs.map((vac) => (
          <div key={vac.name} className={`flex flex-col leading-tight border rounded p-2 justify-center ${
            vac.diffDays === 0 ? 'bg-emerald-50 border-emerald-100' :
            vac.diffDays !== null && vac.diffDays < 0 ? 'bg-amber-50 border-amber-100' :
            'bg-card border-default'
          }`}>
            <span className="text-xs font-semibold text-main mb-1">{vac.name}</span>
            {(() => {
              if (!vac.nextDate) {
                return <span className="text-sm font-semibold text-main border-b border-black/5 pb-1 mb-1">Sin período configurado</span>;
              }
              if (vac.diffDays! > 0) {
                return (
                  <span className="text-sm font-semibold text-main border-b border-black/5 pb-1 mb-1">
                    Faltan {vac.diffDays} día{vac.diffDays !== 1 ? 's' : ''}
                  </span>
                );
              }
              if (vac.diffDays === 0) {
                return (
                  <span className="text-sm font-bold text-main border-b border-black/5 pb-1 mb-1">
                    Toca hoy
                  </span>
                );
              }
              return (
                <span className="text-sm font-semibold text-main border-b border-black/5 pb-1 mb-1">
                  Atrasada {Math.abs(vac.diffDays!)} día{Math.abs(vac.diffDays!) !== 1 ? 's' : ''}
                </span>
              );
            })()}
            {vac.nextDate && (
              <span className="text-[11px] text-muted font-medium">
                Próxima vacuna: {vac.nextDate.toLocaleDateString('es-EC')}
              </span>
            )}
          </div>
        )) : (
          <p className="text-sm text-muted">No hay datos de período configurados</p>
        )}
      </div>
    </div>
  );
}

interface VaccinationTableProps {
  profileId?: string;
  date?: string;
}

export function VaccinationTable({ profileId, date }: VaccinationTableProps) {
  const { vaccinations, loading, error, galponVaccines } = useVaccination({ profileId, date });
  const [selectedVaccination, setSelectedVaccination] = useState<Vaccination | null>(null);

  const calculateNextVaccinations = (vaccination: Vaccination) => {
    if (!vaccination.vaccines.length || !galponVaccines.length) return [];
    
    return vaccination.vaccines.map(vName => {
      const vConfig = galponVaccines.find(gv => gv.name === vName);
      if (!vConfig) return { name: vName, nextDate: null, diffDays: null, period: null };

      const date = new Date(vaccination.vaccinationDate);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + vConfig.period);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextDateMid = new Date(nextDate);
      nextDateMid.setHours(0, 0, 0, 0);

      const diffTime = nextDateMid.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return { name: vName, nextDate, diffDays, period: vConfig.period };
    });
  };

  if (loading) return <LoadingMessage message="Cargando vacunaciones..." />;
  if (error) return <div className="text-red-600 py-8 text-center">{(error as any) instanceof Error ? (error as any).message : String(error)}</div>;

  const columns: Column<Vaccination>[] = [
    ...getRabbitEventBaseColumns<Vaccination>('vaccinationDate'),
    {
      key: 'vaccines',
      header: 'Vacunas',
      className: 'text-muted',
      render: (row) => row.vaccines.join(', ')
    }
  ];

  return (
    <>
      <Table
        data={vaccinations}
        columns={columns}
        emptyMessage="No hay registros de vacunación"
        rowKey={(row) => row.id}
        onRowClick={(row) => setSelectedVaccination(row)}
      />

      <EventDetailsModal
        open={!!selectedVaccination}
        onClose={() => setSelectedVaccination(null)}
        title="Detalles de la Vacunación"
        description="Información detallada sobre el registro de vacunación"
        primaryDateString={selectedVaccination?.vaccinationDate}
        primaryDateLabel="Fecha y Hora de Aplicación"
        profile={selectedVaccination?.profile}
        rabbits={selectedVaccination ? [
          {
            id: selectedVaccination.rabbitId,
            name: selectedVaccination.rabbit?.name,
            code: selectedVaccination.rabbit?.code || selectedVaccination.rabbitCode,
            race: selectedVaccination.rabbit?.race,
            imageUrl: selectedVaccination.rabbit?.imageUrl
          }
        ] : null}
        rabbitsLabel="Conejo"
        customDetails={
          selectedVaccination && <VaccinationCustomDetails nextVacs={calculateNextVaccinations(selectedVaccination)} />
        }
      />
    </>
  );
}
