'use client';

import { useState } from 'react';
import type { Vaccination } from '../types/vaccination.types';
import { useVaccination } from '../hooks/useVaccination';
import { LoadingMessage, Dialog, Badge } from '@/shared/ui';
import { Table, Column } from '@/shared/ui/Table';

export function VaccinationTable() {
  const { vaccinations, loading, error, galponVaccines } = useVaccination();
  const [selectedVaccination, setSelectedVaccination] = useState<Vaccination | null>(null);

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const ecuadorDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
    const formattedDate = ecuadorDate.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formattedTime = ecuadorDate.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true });
    return (
      <div className="flex flex-col">
        <span className="text-slate-800">{formattedDate}</span>
        <span className="text-[11px] text-slate-500">{formattedTime}</span>
      </div>
    );
  };

  const calculateNextVaccinations = (vaccination: Vaccination) => {
    if (!vaccination.vaccines.length || !galponVaccines.length) return [];
    
    return vaccination.vaccines.map(vName => {
      const vConfig = galponVaccines.find(gv => gv.name === vName);
      if (!vConfig) return { name: vName, nextDate: null, diffDays: null, period: null };

      const date = new Date(vaccination.vaccinationDate);
      const nextDate = new Date(date.getTime());
      nextDate.setDate(nextDate.getDate() + vConfig.period);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextDateMid = new Date(nextDate.getTime());
      nextDateMid.setHours(0, 0, 0, 0);

      const diffTime = nextDateMid.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return { name: vName, nextDate, diffDays, period: vConfig.period };
    });
  };

  if (loading) return <LoadingMessage message="Cargando vacunaciones..." />;
  if (error) return <div className="text-red-600 py-8 text-center">{(error as any) instanceof Error ? (error as any).message : String(error)}</div>;

  const columns: Column<Vaccination>[] = [
    {
      key: 'rabbit',
      header: 'Conejo',
      className: 'font-medium text-slate-900',
      render: (row) => row.rabbit ? (
        <div className="flex flex-col">
          <span className="text-slate-900 font-medium">{row.rabbit.name || 'Sin nombre'}</span>
          <span className="text-[11px] text-slate-500">{row.rabbit.code}</span>
        </div>
      ) : row.rabbitCode
    },
    {
      key: 'race',
      header: 'Raza',
      className: 'text-slate-600',
      render: (row) => row.rabbit?.race || 'N/A'
    },
    {
      key: 'vaccines',
      header: 'Vacunas',
      className: 'text-slate-600',
      render: (row) => row.vaccines.join(', ')
    },
    {
      key: 'responsible',
      header: 'Reportado por',
      className: 'text-slate-600',
      render: (row) => row.profile?.fullName || row.profile?.username || 'N/A'
    },
    {
      key: 'date',
      header: 'Fecha y Hora',
      render: (row) => formatDateTime(row.vaccinationDate)
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

      <Dialog
        open={!!selectedVaccination}
        onClose={() => setSelectedVaccination(null)}
        title="Detalles de la Vacunación"
        description="Información detallada sobre el registro de vacunación"
        size="md"
      >
        {selectedVaccination && (() => {
          const nextVacs = calculateNextVaccinations(selectedVaccination);
          
          return (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500 font-medium mb-1">Conejo</p>
                  <div className="flex items-center gap-3">
                    {selectedVaccination.rabbit?.imageUrl ? (
                      <img 
                        src={selectedVaccination.rabbit.imageUrl} 
                        alt="Conejo" 
                        className="w-10 h-10 flex-shrink-0 rounded-full object-cover shadow-sm border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 text-[9px] text-center leading-tight px-1">
                        Sin foto
                      </div>
                    )}
                    <div className="flex flex-col leading-tight">
                      <span className="font-semibold text-slate-800 text-sm">
                        {selectedVaccination.rabbit?.name || 'Sin nombre'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {selectedVaccination.rabbit?.code || selectedVaccination.rabbitCode}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        {selectedVaccination.rabbit?.race || 'Raza N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500 font-medium mb-1">Fecha y Hora de Aplicación</p>
                  <div className="flex flex-col leading-tight mt-1">
                    {(() => {
                      const date = new Date(selectedVaccination.vaccinationDate);
                      const ecuadorDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
                      const formattedDate = ecuadorDate.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
                      const formattedTime = ecuadorDate.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true });
                      return (
                        <>
                          <span className="text-sm font-semibold text-slate-800">{formattedDate}</span>
                          <span className="text-[11px] text-slate-500 font-medium mt-0.5">{formattedTime}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-slate-500 font-medium mb-1">Reportado por</p>
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold text-slate-800">
                      {selectedVaccination.profile?.fullName || selectedVaccination.profile?.username || 'Sistema'}
                    </span>
                    {selectedVaccination.profile?.username && (
                      <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                        @{selectedVaccination.profile.username}
                      </span>
                    )}
                    {selectedVaccination.profile?.email && (
                      <span className="text-[10px] text-slate-400 mt-0.5 break-all">
                        {selectedVaccination.profile.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4">
                <p className="text-xs text-slate-500 font-medium mb-3">Seguimiento de Vacuna Aplicada</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {nextVacs.length > 0 ? nextVacs.map((vac, idx) => (
                    <div key={idx} className="flex flex-col leading-tight border border-slate-100 rounded bg-white p-2 justify-center">
                      <span className="text-xs font-semibold text-slate-700">{vac.name}</span>
                      {vac.nextDate ? (
                        vac.diffDays! > 0 ? (
                          <span className="text-[11px] text-slate-500 font-medium mt-1">
                            Faltan {vac.diffDays} día{vac.diffDays !== 1 ? 's' : ''}
                          </span>
                        ) : vac.diffDays === 0 ? (
                          <span className="text-[11px] text-slate-600 font-medium mt-1">
                            Toca hoy
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium mt-1">
                            Atrasada {Math.abs(vac.diffDays!)} día{Math.abs(vac.diffDays!) !== 1 ? 's' : ''}
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] text-slate-500 font-medium mt-1">
                          Sin período
                        </span>
                      )}
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500">No hay datos de período configurados</p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </Dialog>
    </>
  );
}
