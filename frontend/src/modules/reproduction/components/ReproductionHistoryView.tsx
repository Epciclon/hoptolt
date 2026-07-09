'use client';

import type { Reproduction } from '../types/reproduction.types';
import { FilterBar } from '@/shared/ui/FilterBar';
import { Table, Column } from '@/shared/ui/Table';
import { Dialog, DateTimeBadge } from '@/shared/ui';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mortalityService } from '@/modules/mortality/services/mortality.service';
import type { Mortality } from '@/modules/mortality/types/mortality.types';

interface ReproductionHistoryViewProps {
  reproductions: Reproduction[];
}

type HistoryRecord = 
  | (Reproduction & { type: 'reproduction' }) 
  | (Mortality & { 
      type: 'mortality'; 
      maleCode?: string | null;
      maleName?: string | null;
      maleRace?: string | null;
    });



const renderKits = (row: HistoryRecord) => {
  if (row.type === 'mortality') {
    const amount = row.numberOfKits;
    return <span className="font-medium text-slate-700">{amount === 1 ? '1 muerto' : `${amount} muertos`}</span>;
  }
  const hasKits = row.bornKits !== null && row.bornKits !== undefined && row.bornKits > 0;
  if (!hasKits) return <span className="text-slate-400">-</span>;
  
  const isFallido = row.status === 'fallido';
  const label = isFallido ? 'muerto' : 'vivo';
  const labelPlural = isFallido ? 'muertos' : 'vivos';
  const text = row.bornKits === 1 ? `1 ${label}` : `${row.bornKits} ${labelPlural}`;
  return <span className="font-medium text-slate-700">{text}</span>;
};

const historyColumns: Column<HistoryRecord>[] = [
  {
    key: 'female',
    header: 'Coneja',
    className: 'w-[18%]',
    headerClassName: 'w-[18%]',
    render: (row) => {
      if (row.type === 'reproduction') {
        return (
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-slate-800 text-sm">{row.femaleName || row.femaleCode}</span>
            {row.femaleName && <span className="text-[11px] text-slate-500 font-medium">{row.femaleCode}</span>}
          </div>
        );
      } else {
        return (
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-slate-800 text-sm">{row.rabbitName || row.rabbitCode || ''}</span>
            {row.rabbitName && <span className="text-[11px] text-slate-500 font-medium">{row.rabbitCode || ''}</span>}
          </div>
        );
      }
    }
  },
  {
    key: 'male',
    header: 'Conejo',
    className: 'w-[18%]',
    headerClassName: 'w-[18%]',
    render: (row) => {
      if (row.maleName || row.maleCode) {
        return (
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-slate-800 text-sm">{row.maleName || row.maleCode || '-'}</span>
            {row.maleName && <span className="text-[11px] text-slate-500 font-medium">{row.maleCode || ''}</span>}
          </div>
        );
      }
      if (row.type === 'reproduction' && (row.maleName || row.maleCode)) {
        return (
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-slate-800 text-sm">{row.maleName || row.maleCode || '-'}</span>
            {row.maleName && <span className="text-[11px] text-slate-500 font-medium">{row.maleCode || ''}</span>}
          </div>
        );
      }
      return <div className="text-slate-400">-</div>;
    }
  },
  {
    key: 'dates',
    header: 'Fecha Registro',
    className: 'w-[16%]',
    headerClassName: 'w-[16%]',
    render: (row) => {
      if (row.type === 'reproduction') {
        return <DateTimeBadge dateString={(row as any).updatedAt || row.mountDate} />;
      }
      return <DateTimeBadge dateString={row.deathDate} />;
    }
  },
  {
    key: 'kits',
    header: 'Gazapos',
    className: 'w-[16%]',
    headerClassName: 'w-[16%]',
    render: renderKits
  },
  {
    key: 'status',
    header: 'Estado',
    className: 'w-[16%]',
    headerClassName: 'w-[16%]',
    render: (row) => {
      if (row.type === 'reproduction') {
        if (row.status === 'completado') {
          return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">Completado</span>;
        }
        return <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full border border-red-200">Fallido</span>;
      } else {
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">Baja Parcial</span>;
      }
    }
  },
  {
    key: 'reporter',
    header: 'Reportado por',
    className: 'w-[16%]',
    headerClassName: 'w-[16%]',
    render: (row) => {
      let text = row.profile?.fullName || row.profile?.username || (row as any).profileName || 'Sistema';
      return (
        <div className="max-w-[200px] truncate text-slate-600" title={text}>
          {text}
        </div>
      );
    }
  }
];

function getFilteredReproductions(reproductions: Reproduction[], searchTerm: string, filterStatus: string) {
  return reproductions.filter(r => {
    if (r.status !== 'completado' && r.status !== 'fallido') return false;

    const matchesSearch =
      r.femaleName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.femaleCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus ? r.status === filterStatus : true;

    return matchesSearch && matchesStatus;
  });
}

function getFilteredMortalities(mortalities: any[], reproductions: Reproduction[], searchTerm: string, filterStatus: string) {
  return mortalities.filter(m => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      m.rabbitName?.toLowerCase().includes(search) ||
      m.rabbitCode?.toLowerCase().includes(search);
    const matchesStatus = filterStatus ? filterStatus === 'baja' : true;
    return matchesSearch && matchesStatus;
  }).map(m => {
    const lastRep = reproductions
      .filter(r => r.femaleId === m.rabbitId)
      .sort((a, b) => new Date(b.mountDate).getTime() - new Date(a.mountDate).getTime())[0];
      
    return {
      ...m,
      type: 'mortality' as const,
      maleName: lastRep?.maleName,
      maleCode: lastRep?.maleCode,
      maleRace: lastRep?.maleRace,
      profile: {
        fullName: m.responsible,
        username: m.profileUsername,
        email: m.profileEmail
      }
    };
  });
}

function RabbitProfileCard({ 
  imageUrl, 
  name, 
  code, 
  race 
}: Readonly<{ imageUrl?: string | null; name?: string | null; code?: string | null; race?: string | null }>) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
      <p className="text-xs text-slate-500 font-medium mb-1">Coneja</p>
      <div className="flex items-center gap-3 mt-2">
        {imageUrl ? (
          <img src={imageUrl} alt="Coneja" className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-200" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 border border-slate-200">
            Sin foto
          </div>
        )}
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold text-slate-800">{name || code}</span>
          {name && <span className="text-xs text-slate-500">{code}</span>}
          <span className="text-xs text-slate-500 capitalize">{race || 'Raza no especificada'}</span>
        </div>
      </div>
    </div>
  );
}

function PartnerProfileCard({ 
  imageUrl, 
  name, 
  code, 
  race 
}: Readonly<{ imageUrl?: string | null; name?: string | null; code?: string | null; race?: string | null }>) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
      <p className="text-xs text-slate-500 font-medium mb-1">Pareja</p>
      <div className="flex items-center gap-3 mt-2">
        {imageUrl ? (
          <img src={imageUrl} alt="Pareja" className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-200" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 border border-slate-200 text-center leading-none">
            Sin foto
          </div>
        )}
        <div className="flex flex-col leading-tight">
          {code ? (
            <>
              <span className="text-sm font-bold text-slate-800">{name || code}</span>
              {name && <span className="text-xs text-slate-500">{code}</span>}
              <span className="text-xs text-slate-500 capitalize">{race || 'Raza no especificada'}</span>
            </>
          ) : (
            <span className="text-sm font-medium text-slate-500 mt-1">No registrado</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ReporterProfileCard({ 
  profile 
}: Readonly<{ profile?: { fullName?: string | null; username?: string | null; email?: string | null } | null }>) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 w-full">
      <p className="text-xs text-slate-500 font-medium mb-1">Reportado por</p>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-slate-800">
          {profile?.fullName || profile?.username || 'Sistema'}
        </span>
        {profile?.username && (
          <span className="text-[11px] text-slate-500 font-medium mt-0.5">
            @{profile.username}
          </span>
        )}
        {profile?.email && (
          <span className="text-[10px] text-slate-400 mt-0.5 break-all">
            {profile.email}
          </span>
        )}
      </div>
    </div>
  );
}
function MortalityDetails({ record: selectedRecord }: Readonly<{ record: Mortality & { type: 'mortality'; maleCode?: string | null; maleName?: string | null; maleRace?: string | null; } }>) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <RabbitProfileCard 
        imageUrl={selectedRecord.rabbitImageUrl} 
        name={selectedRecord.rabbitName} 
        code={selectedRecord.rabbitCode} 
        race={selectedRecord.rabbitRace} 
      />

      <PartnerProfileCard 
        imageUrl={(selectedRecord as any).maleImageUrl} 
        name={selectedRecord.maleName} 
        code={selectedRecord.maleCode} 
        race={selectedRecord.maleRace} 
      />

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <p className="text-xs text-slate-500 font-medium mb-1">Estado</p>
        <p className="text-sm font-semibold text-slate-800 mt-2 capitalize">
          Baja Parcial
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <p className="text-xs text-slate-500 font-medium mb-1">Fecha de Baja</p>
        <div className="flex flex-col mt-2">
          <span className="text-sm font-semibold text-slate-800">{new Date(selectedRecord.deathDate as any).toLocaleDateString('es-EC')}</span>
          <span className="text-xs text-slate-500">{new Date(selectedRecord.deathDate as any).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <ReporterProfileCard profile={selectedRecord.profile} />

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <p className="text-xs text-slate-500 font-medium mb-1">Causa de Muerte</p>
        <p className="text-sm font-semibold text-slate-800 mt-2 capitalize">
          {selectedRecord.cause || 'No especificada'}
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <p className="text-xs text-slate-500 font-medium mb-1">Cantidad de Gazapos</p>
        <p className="text-sm font-semibold text-slate-800 mt-2">
          {selectedRecord.numberOfKits === 1 ? '1 muerto' : `${selectedRecord.numberOfKits} muertos`}
        </p>
      </div>

      {(selectedRecord.observations) && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:col-span-2">
          <p className="text-xs text-slate-500 font-medium mb-1">Observaciones</p>
          <p className="text-sm font-semibold text-slate-800 mt-2">
            {selectedRecord.observations}
          </p>
        </div>
      )}
    </div>
  );
}

function ReproductionDetails({ record: selectedRecord }: Readonly<{ record: Reproduction & { type: 'reproduction' } }>) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <RabbitProfileCard 
        imageUrl={selectedRecord.imageUrl} 
        name={selectedRecord.femaleName} 
        code={selectedRecord.femaleCode} 
        race={selectedRecord.femaleRace} 
      />

      <PartnerProfileCard 
        imageUrl={(selectedRecord as any).maleImageUrl} 
        name={selectedRecord.maleName} 
        code={selectedRecord.maleCode} 
        race={selectedRecord.maleRace} 
      />

      {selectedRecord.status === 'fallido' ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <p className="text-xs text-slate-500 font-medium mb-1">Fecha de Cancelación</p>
          <div className="flex flex-col mt-2">
            <span className="text-sm font-semibold text-slate-800">{selectedRecord.updatedAt ? new Date(selectedRecord.updatedAt as any).toLocaleDateString('es-EC') : 'N/A'}</span>
            <span className="text-xs text-slate-500">{selectedRecord.updatedAt ? new Date(selectedRecord.updatedAt as any).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-500 font-medium mb-1">Fecha de Monta</p>
            <div className="flex flex-col mt-2">
              <span className="text-sm font-semibold text-slate-800">{new Date(selectedRecord.mountDate).toLocaleDateString('es-EC')}</span>
              <span className="text-xs text-slate-500">{new Date(selectedRecord.mountDate).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-500 font-medium mb-1">Fecha de Destete de Gazapos</p>
            <div className="flex flex-col mt-2">
              <span className="text-sm font-semibold text-slate-800">{selectedRecord.updatedAt ? new Date(selectedRecord.updatedAt as any).toLocaleDateString('es-EC') : 'N/A'}</span>
              <span className="text-xs text-slate-500">{selectedRecord.updatedAt ? new Date(selectedRecord.updatedAt as any).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
            </div>
          </div>
        </>
      )}

      <ReporterProfileCard profile={selectedRecord.profile} />

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 w-full">
        <p className="text-xs text-slate-500 font-medium mb-1">Estado</p>
        <p className="text-sm font-semibold text-slate-800 mt-2 capitalize">
          {selectedRecord.status}
        </p>
      </div>

      {!!selectedRecord.bornKits && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 w-full">
          <p className="text-xs text-slate-500 font-medium mb-1">Cantidad de Gazapos</p>
          <p className="text-sm font-semibold text-slate-800 mt-2">
            {(() => {
              const isFallido = selectedRecord.status === 'fallido';
              const labelSingular = isFallido ? 'muerto' : 'vivo';
              const labelPlural = isFallido ? 'muertos' : 'vivos';
              return selectedRecord.bornKits === 1 
                ? `1 ${labelSingular}` 
                : `${selectedRecord.bornKits} ${labelPlural}`;
            })()}
          </p>
        </div>
      )}

      {selectedRecord.status === 'fallido' && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:col-span-2">
          <p className="text-xs text-slate-500 font-medium mb-1">Cancelación de Parto</p>
          <p className="text-sm font-semibold text-slate-800 mt-2">
            {selectedRecord.cancellationReason || 'No especificada'}
          </p>
        </div>
      )}
    </div>
  );
}

export function ReproductionHistoryView({ reproductions }: Readonly<ReproductionHistoryViewProps>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
  
  const { data: kitMortalitiesData, isLoading: loadingMortalities } = useQuery({
    queryKey: ['kitMortalitiesHistory'],
    queryFn: () => mortalityService.getAll(100, true),
  });
  const kitMortalities = kitMortalitiesData || [];

  const historico = useMemo(() => getFilteredReproductions(reproductions, searchTerm, filterStatus), [reproductions, searchTerm, filterStatus]);

  const combinedHistory = useMemo(() => {
    const mortalities = getFilteredMortalities(kitMortalities, reproductions, searchTerm, filterStatus);
    
    return [
      ...historico.map((r: Reproduction) => ({ ...r, type: 'reproduction' as const })),
      ...mortalities
    ].sort((a, b) => {
      const dateA = a.type === 'reproduction' ? new Date((a as any).updatedAt || (a as any).mountDate).getTime() : new Date((a as any).deathDate).getTime();
      const dateB = b.type === 'reproduction' ? new Date((b as any).updatedAt || (b as any).mountDate).getTime() : new Date((b as any).deathDate).getTime();
      return dateB - dateA;
    });
  }, [historico, kitMortalities, reproductions, searchTerm, filterStatus]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 items-start">
        <p className="text-base font-medium text-slate-700">Aquí se encuentran los registros históricos de montas que han finalizado exitosamente destetadas o que han fallado por abortos o muertes.</p>
      </div>
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por nombre o código de coneja..."
        filters={[
          {
            key: 'status',
            placeholder: 'Todos los estados',
            options: [
              { value: 'completado', label: 'Completado' },
              { value: 'fallido', label: 'Fallido' },
              { value: 'baja', label: 'Bajas de Gazapos' }
            ],
            value: filterStatus,
            onChange: setFilterStatus
          }
        ]}
      />

      <Table
        columns={historyColumns}
        data={combinedHistory}
        loading={loadingMortalities}
        emptyMessage="No hay registros en el historial que coincidan con los filtros."
        rowKey={(row) => `${row.type}-${row.id}`}
        onRowClick={setSelectedRecord}
      />

      {selectedRecord && (
        <Dialog
          open={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          title={selectedRecord.type === 'mortality' ? 'Detalles de Baja de Gazapos' : 'Detalles de Reproducción'}
          description="Información detallada sobre el registro histórico"
          size="2xl"
        >
          <div className="space-y-6 pt-2">

            {selectedRecord.type === 'mortality' ? (
              <MortalityDetails record={selectedRecord} />
            ) : (
              <ReproductionDetails record={selectedRecord} />
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
