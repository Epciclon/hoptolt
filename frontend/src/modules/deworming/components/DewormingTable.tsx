'use client';

import { useState } from 'react';
import type { Deworming } from '../types/deworming.types';
import { useDeworming } from '../hooks/useDeworming';
import { LoadingMessage, EventDetailsModal } from '@/shared/ui';
import { Table } from '@/shared/ui/Table';
import type { Column } from '@/shared/ui/Table';
import { getRabbitEventBaseColumns } from '@/shared/utils/tableUtils';

interface NextDewormingData {
  nextDate: Date;
  diffDays: number;
  period: number;
}

function DewormingCustomDetails({ nextDeworm }: Readonly<{ nextDeworm: NextDewormingData | null }>) {
  return (
    <div className="bg-theme-surface border border-strong rounded-lg p-3 col-span-2">
      <p className="text-xs text-muted font-medium mb-3">Seguimiento de Desparasitación</p>
      <div className={`flex flex-col leading-tight border rounded p-3 justify-center ${
        (() => {
          if (!nextDeworm) return 'bg-card border-default';
          if (nextDeworm.diffDays === 0) return 'bg-emerald-50 border-emerald-100';
          if (nextDeworm.diffDays < 0) return 'bg-amber-50 border-amber-100';
          return 'bg-card border-default';
        })()
      }`}>
        {nextDeworm ? (
          <>
            {(() => {
              if (nextDeworm.diffDays > 0) {
                return (
                  <span className="text-sm font-semibold text-main border-b border-black/5 pb-2 mb-2">
                    Faltan {nextDeworm.diffDays} día{nextDeworm.diffDays !== 1 ? 's' : ''}
                  </span>
                );
              }
              if (nextDeworm.diffDays === 0) {
                return (
                  <span className="text-sm font-bold text-main border-b border-black/5 pb-2 mb-2">
                    Toca hoy
                  </span>
                );
              }
              return (
                <span className="text-sm font-semibold text-main border-b border-black/5 pb-2 mb-2">
                  Atrasada {Math.abs(nextDeworm.diffDays)} día{Math.abs(nextDeworm.diffDays) !== 1 ? 's' : ''}
                </span>
              );
            })()}
            <span className="text-[12px] text-muted font-medium">
              Próxima desparasitación: {nextDeworm.nextDate.toLocaleDateString('es-EC')}
            </span>
          </>
        ) : (
          <>
            <span className="text-sm font-semibold text-theme-faint border-b border-default pb-2 mb-2">
              Sin fecha
            </span>
            <span className="text-[12px] text-muted font-medium">
              Sin período configurado
            </span>
          </>
        )}
      </div>
    </div>
  );
}

interface DewormingTableProps {
  readonly profileId?: string;
  readonly date?: string;
}

export function DewormingTable({ profileId, date }: DewormingTableProps) {
  const { dewormings, loading, error, dewormingPeriod } = useDeworming({ profileId, date });
  const [selectedDeworming, setSelectedDeworming] = useState<Deworming | null>(null);

  const calculateNextDeworming = (deworming: Deworming) => {
    if (!dewormingPeriod) return null;

    const date = new Date(deworming.dewormingDate);
    const nextDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
    nextDate.setDate(nextDate.getDate() + dewormingPeriod);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDateMid = new Date(nextDate);
    nextDateMid.setHours(0, 0, 0, 0);

    const diffTime = nextDateMid.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return { nextDate, diffDays, period: dewormingPeriod };
  };

  if (loading) return <LoadingMessage message="Cargando desparasitaciones..." />;
  if (error) return <div className="text-red-600 py-8 text-center">{error}</div>;

  const columns: Column<Deworming>[] = [
    ...getRabbitEventBaseColumns<Deworming>('dewormingDate')
  ];

  return (
    <>
      <Table
        data={dewormings}
        columns={columns}
        emptyMessage="No hay registros de desparasitación"
        rowKey={(row) => row.id}
        onRowClick={(row) => setSelectedDeworming(row)}
      />

      <EventDetailsModal
        open={!!selectedDeworming}
        onClose={() => setSelectedDeworming(null)}
        title="Detalles de Desparasitación"
        description="Información detallada sobre el registro de desparasitación"
        primaryDateString={selectedDeworming?.dewormingDate}
        primaryDateLabel="Fecha y Hora de Aplicación"
        profile={selectedDeworming?.profile}
        rabbits={selectedDeworming ? [
          {
            id: selectedDeworming.rabbitId,
            name: selectedDeworming.rabbit?.name,
            code: selectedDeworming.rabbit?.code || selectedDeworming.rabbitCode,
            race: selectedDeworming.rabbit?.race,
            imageUrl: selectedDeworming.rabbit?.imageUrl
          }
        ] : null}
        rabbitsLabel="Conejo"
        customDetails={
          selectedDeworming && <DewormingCustomDetails nextDeworm={calculateNextDeworming(selectedDeworming)} />
        }
      />
    </>
  );
}
