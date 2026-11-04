'use client';

import { useState } from 'react';
import { Table, LoadingMessage, EventDetailsModal } from '@/shared/ui';
import type { Column } from '@/shared/ui/Table';
import type { Mortality } from '../types/mortality.types';
import { useMortality } from '../hooks/useMortality';

interface MortalityTableProps {
  readonly profileId?: string;
  readonly date?: string;
}

export function MortalityTable({ profileId, date }: MortalityTableProps) {
  const { mortalities, loading, error } = useMortality({ profileId, date });
  const [selectedMortality, setSelectedMortality] = useState<Mortality | null>(null);

  if (loading) return <LoadingMessage message="Cargando mortalidades..." />;
  if (error) return <div className="text-red-600 py-8 text-center">{error}</div>;

  const columns: Column<Mortality>[] = [
    {
      key: 'rabbit',
      header: 'Conejo',
      render: (row) => {
        const hasName = row.rabbitName && row.rabbitName !== 'N/A';
        return (
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-main text-sm">{hasName ? row.rabbitName : row.rabbitCode}</span>
            {hasName && <span className="text-xs text-muted font-medium mt-0.5">{row.rabbitCode}</span>}
          </div>
        );
      },
    },
    {
      key: 'cause',
      header: 'Causa',
      render: (row) => (
        <span className="text-muted capitalize text-sm">{row.cause}</span>
      ),
    },
    {
      key: 'date',
      header: 'Fecha de Baja',
      render: (row) => {
        const dateObj = new Date(row.deathDate);
        // Correct for timezone to display correct date
        const localDate = new Date(dateObj.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
        return <span className="text-sm text-main">{localDate.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>;
      },
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        data={mortalities}
        emptyMessage="No hay registros de bajas por mortalidad."
        rowKey={(row) => row.id}
        onRowClick={(row) => setSelectedMortality(row)}
      />

      <EventDetailsModal
        open={!!selectedMortality}
        onClose={() => setSelectedMortality(null)}
        title="Detalles de la Baja"
        description="Información detallada sobre el deceso del conejo"
        primaryDateString={selectedMortality?.deathDate}
        primaryDateLabel="Fecha de Baja"
        profile={selectedMortality?.profile || (selectedMortality?.responsible ? { username: selectedMortality.responsible } : null)}
        rabbits={selectedMortality ? [
          {
            id: selectedMortality.rabbitId,
            name: selectedMortality.rabbitName && selectedMortality.rabbitName !== 'N/A' ? selectedMortality.rabbitName : undefined,
            code: selectedMortality.rabbitCode,
            race: selectedMortality.rabbitRace && selectedMortality.rabbitRace !== 'N/A' ? selectedMortality.rabbitRace : undefined,
            imageUrl: selectedMortality.rabbitImageUrl
          }
        ] : null}
        rabbitsLabel="Conejo"
        customDetails={
          selectedMortality && (
            <>
              <div className="bg-theme-surface border border-strong rounded-lg p-3 col-span-1">
                <p className="text-xs text-muted font-medium mb-1">Causa</p>
                <div className="flex flex-col leading-tight mt-1">
                  <span className="text-sm font-semibold text-main capitalize">
                    {selectedMortality.cause}
                  </span>
                </div>
              </div>
              <div className="bg-theme-surface border border-strong rounded-lg p-3 col-span-1 sm:col-span-2">
                <p className="text-xs text-muted font-medium mb-1">Observaciones</p>
                <div className="flex flex-col leading-tight mt-1">
                  <span className="text-sm text-main whitespace-pre-wrap leading-relaxed">
                    {selectedMortality.observations || 'Sin observaciones registradas.'}
                  </span>
                </div>
              </div>
            </>
          )
        }
      />
    </>
  );
}
