'use client';

import { useRabbits } from '@/modules/rabbits/hooks/useRabbits';
import { useRaces } from '@/modules/races/hooks/useRaces';
import { FilterBar } from '@/shared/ui/FilterBar';
import { Pagination } from '@/shared/ui/Pagination';
import { Badge, Button, LoadingMessage, CatalogCard } from '@/shared/ui';
import { useState } from 'react';
import { Network, Edit2, Trash2 } from 'lucide-react';
import type { Rabbit } from '@/modules/rabbits/types/rabbit.types';

interface GenealogyCatalogProps {
  onViewTree: (rabbit: Rabbit) => void;
  onEditRelation: (rabbit: Rabbit) => void;
  onDeleteRelation: (rabbit: Rabbit) => void;
}

export function GenealogyCatalog({ onViewTree, onEditRelation, onDeleteRelation }: Readonly<GenealogyCatalogProps>) {
  const { rabbits, pagination, loading, setPage, setSearch, setRace, setSex, setPurpose, filters } = useRabbits();
  const { races } = useRaces();
  
  const [selectedRabbitId, setSelectedRabbitId] = useState<number | null>(null);

  const toggleRabbitSelection = (rabbitId: number) => {
    setSelectedRabbitId(prev => prev === rabbitId ? null : rabbitId);
  };

  const raceOptions = races.map(r => ({ label: r.name, value: r.name }));
  const sexOptions = [
    { label: 'Macho', value: 'macho' },
    { label: 'Hembra', value: 'hembra' }
  ];
  const purposeOptions = [
    { label: 'Reproducción', value: 'Reproducción' },
    { label: 'Engorde', value: 'Engorde' }
  ];

  const formatAge = (age: number | null | undefined) => {
    if (age === null || age === undefined) return '-';
    return `${age} ${age === 1 ? 'mes' : 'meses'}`;
  };

  const renderContent = () => {
    if (loading) return <LoadingMessage message="Cargando genealogías..." />;
    if (rabbits.length === 0) return <p className="text-sm text-slate-500 text-center py-8 bg-slate-50 rounded-lg border border-slate-200">No hay conejos registrados con esos filtros.</p>;
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {rabbits.map((rabbit) => {
          const isSelected = selectedRabbitId === rabbit.id;
          return (
          <CatalogCard
            key={rabbit.id}
            imageUrl={rabbit.imageUrl}
            imageAlt={rabbit.name || rabbit.code}
            badge={rabbit.code}
            title={rabbit.name || 'Sin nombre'}
            subtitle={rabbit.race}
            isSelected={isSelected}
            onClick={() => toggleRabbitSelection(rabbit.id)}
            topRightAction={
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewTree(rabbit);
                }}
                className="bg-slate-900/70 hover:bg-slate-900 text-white p-1.5 rounded-md shadow-sm backdrop-blur-sm transition-colors"
                title="Ver Árbol Genealógico"
              >
                <Network size={16} />
              </button>
            }
            tags={
              <Badge variant={rabbit.sex === 'macho' ? 'primary' : 'success'}>
                {rabbit.sex.charAt(0).toUpperCase() + rabbit.sex.slice(1)}
              </Badge>
            }
            details={
              <>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-slate-700">Edad:</span> {formatAge(rabbit.age)}
                </div>
                {rabbit.weight !== undefined && rabbit.weight !== null && (
                  <>
                    <div className="w-px h-3 bg-slate-300"></div>
                    <div className="flex items-center gap-1"><span className="font-semibold text-slate-700">Peso:</span> {rabbit.weight} kg</div>
                  </>
                )}
              </>
            }
            actions={
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 min-w-[80px]"
                  icon={<Edit2 size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditRelation(rabbit);
                  }}
                >
                  Padres
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  className="flex-1 min-w-[80px]"
                  icon={<Trash2 size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRelation(rabbit);
                  }}
                >
                  Eliminar
                </Button>
              </>
            }
          />
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        searchValue={filters.search || ''}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Buscar conejo por código o nombre..."
        filters={[
          { key: 'race', placeholder: 'Todas las Razas', options: raceOptions, value: filters.race || '', onChange: (val) => { setRace(val); setPage(1); } },
          { key: 'sex', placeholder: 'Cualquier Sexo', options: sexOptions, value: filters.sex || '', onChange: (val) => { setSex(val); setPage(1); } },
          { key: 'purpose', placeholder: 'Todo Propósito', options: purposeOptions, value: filters.purpose || '', onChange: (val) => { setPurpose(val); setPage(1); } }
        ]}
      />

      {renderContent()}

      {!loading && rabbits.length > 0 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
