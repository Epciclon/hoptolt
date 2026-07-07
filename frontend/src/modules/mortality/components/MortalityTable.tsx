'use client';

import { useState } from 'react';
import { Table, Dialog, Badge, LoadingMessage } from '@/shared/ui';
import type { Column } from '@/shared/ui/Table';
import type { Mortality } from '../types/mortality.types';
import { useMortality } from '../hooks/useMortality';

export function MortalityTable() {
  const { mortalities, loading, error } = useMortality();
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
            <span className="font-semibold text-slate-800 text-sm">{hasName ? row.rabbitName : row.rabbitCode}</span>
            {hasName && <span className="text-[11px] text-slate-500 font-medium">{row.rabbitCode}</span>}
          </div>
        );
      },
    },
    {
      key: 'cause',
      header: 'Causa',
      render: (row) => (
        <span className="text-slate-600 capitalize">{row.cause}</span>
      ),
    },
    {
      key: 'responsible',
      header: 'Reportado por',
      render: (row) => row.responsible,
    },
    {
      key: 'date',
      header: 'Fecha de Baja',
      render: (row) => {
        const dateObj = new Date(row.deathDate);
        // Correct for timezone to display correct date
        const localDate = new Date(dateObj.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
        return localDate.toLocaleDateString();
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

      {/* Modal de Detalles */}
      <Dialog
        open={!!selectedMortality}
        onClose={() => setSelectedMortality(null)}
        title="Detalles de la Baja"
        description="Información detallada sobre el deceso del conejo"
        size="md"
      >
        {selectedMortality && (
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500 font-medium mb-1">Conejo</p>
                <div className="flex flex-col leading-tight">
                  <span className="font-semibold text-slate-800 text-sm">
                    {selectedMortality.rabbitName && selectedMortality.rabbitName !== 'N/A'
                      ? selectedMortality.rabbitName
                      : selectedMortality.rabbitCode}
                  </span>
                  {selectedMortality.rabbitName && selectedMortality.rabbitName !== 'N/A' && (
                    <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {selectedMortality.rabbitCode}
                    </span>
                  )}
                  {selectedMortality.rabbitRace && selectedMortality.rabbitRace !== 'N/A' && (
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {selectedMortality.rabbitRace}
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500 font-medium mb-1">Causa</p>
                <p className="text-sm font-semibold text-slate-800 capitalize">
                  {selectedMortality.cause}
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500 font-medium mb-1">Reportado por</p>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold text-slate-800">
                    {selectedMortality.responsible}
                  </span>
                  {selectedMortality.profileUsername && (
                    <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                      @{selectedMortality.profileUsername}
                    </span>
                  )}
                  {selectedMortality.profileEmail && (
                    <span className="text-[10px] text-slate-400 mt-0.5 break-all">
                      {selectedMortality.profileEmail}
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500 font-medium mb-1">Fecha</p>
                <div className="flex flex-col leading-tight mt-1">
                  {(() => {
                    const date = new Date(selectedMortality.deathDate);
                    const ecuadorDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
                    const formattedDate = ecuadorDate.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    return (
                      <span className="text-sm font-semibold text-slate-800">{formattedDate}</span>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
              <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wide">Observaciones</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {selectedMortality.observations || 'Sin observaciones registradas.'}
              </p>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
