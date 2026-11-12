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
  const gridColsClass = nextVacs.length <= 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2';

  const getStatusLabel = (vac: NextVaccinationData) => {
    if (!vac.nextDate) return 'Aplicada';
    if (vac.diffDays! > 0) return `Faltan ${vac.diffDays} día${vac.diffDays === 1 ? '' : 's'}`;
    if (vac.diffDays === 0) return 'Toca hoy';
    const absDays = Math.abs(vac.diffDays!);
    return `Atrasada ${absDays} día${absDays === 1 ? '' : 's'}`;
  };

  return (
    <div className="bg-theme-surface border border-strong rounded-lg p-3 col-span-1 sm:col-span-2">
      <p className="text-xs text-muted font-medium mb-3">Seguimiento de Vacuna Aplicada</p>
      {nextVacs.length > 0 ? (
        <div className={`grid ${gridColsClass} gap-3`}>
          {nextVacs.map((vac) => {
            let cardTone = 'bg-card border-default';
            if (vac.diffDays === 0) {
              cardTone = 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50';
            } else if (vac.diffDays !== null && vac.diffDays < 0) {
              cardTone = 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50';
            }

            const statusColor = !vac.nextDate
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-main';

            return (
              <div key={vac.name} className={`flex flex-col leading-tight border rounded-lg p-3 justify-center ${cardTone}`}>
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-default pb-2 mb-2">
                  <span className="text-sm font-semibold text-main">{vac.name}</span>
                  <span className={`text-xs sm:text-sm font-semibold ${statusColor}`}>{getStatusLabel(vac)}</span>
                </div>
                <span className="text-xs text-muted font-medium">
                  {vac.nextDate
                    ? `Próxima vacuna: ${vac.nextDate.toLocaleDateString('es-EC')}`
                    : 'Sin período activo en el galpón'}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted">No hay datos de período configurados</p>
      )}
    </div>
  );
}

interface VaccinationTableProps {
  readonly profileId?: string;
  readonly date?: string;
}

export function VaccinationTable({ profileId, date }: VaccinationTableProps) {
  const { vaccinations, loading, error, galponVaccines } = useVaccination({ profileId, date });
  const [selectedVaccination, setSelectedVaccination] = useState<Vaccination | null>(null);

  const calculateNextVaccinations = (vaccination: Vaccination) => {
    if (!vaccination.vaccines.length) return [];
    
    return vaccination.vaccines.map(vName => {
      const normalized = vName.trim().toLowerCase();
      const vConfig = galponVaccines.find(gv => gv.name.trim().toLowerCase() === normalized);
      if (!vConfig) return { name: vName, nextDate: null, diffDays: null, period: null };

      const vDate = new Date(vaccination.vaccinationDate);
      const nextDate = new Date(vDate);
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
